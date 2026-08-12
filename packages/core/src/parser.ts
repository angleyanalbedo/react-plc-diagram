import { DOMParser } from "@xmldom/xmldom";
import {
  PLCOPEN_XML_201_NAMESPACE,
  type ParsePlcOpenXmlResult, type PlcConnection, type PlcDiagnostic,
  type PlcDiagram, type PlcElement, type PlcElementKind, type PlcLanguage,
  type PlcPoint, type PlcPort, type PlcPou,
} from "./model.js";

const MAX_XML_LENGTH = 5_000_000;
const GRAPHICAL_KINDS = new Set<PlcElementKind>([
  "inVariable", "outVariable", "inOutVariable", "block", "leftPowerRail",
  "rightPowerRail", "contact", "coil", "connector", "continuation", "comment",
]);

const localName = (node: Node): string =>
  (node as Element).localName ?? node.nodeName.split(":").at(-1) ?? node.nodeName;
const elementChildren = (root: Element): Element[] =>
  Array.from(root.childNodes).filter((node): node is Element => node.nodeType === 1);
const child = (root: Element, name: string): Element | undefined =>
  elementChildren(root).find((node) => localName(node) === name);
const descendants = (root: Document | Element, name: string): Element[] =>
  Array.from(root.getElementsByTagName("*")).filter((node) => localName(node) === name);

function numberAttr(element: Element | undefined, name: string, fallback = 0): number {
  const value = Number(element?.getAttribute(name));
  return Number.isFinite(value) ? value : fallback;
}

const positionOf = (element?: Element): PlcPoint => ({
  x: numberAttr(element, "x"),
  y: numberAttr(element, "y"),
});

function detectLanguage(pou: Element): PlcLanguage {
  const body = child(pou, "body");
  if (!body) return "unsupported";
  if (child(body, "FBD")) return "fbd";
  if (child(body, "LD")) return "ld";
  return "unsupported";
}

function ancestorFormalParameter(element: Element, boundary: Element): string | undefined {
  let current = element.parentNode;
  while (current && current !== boundary) {
    if (current.nodeType === 1) {
      const value = (current as Element).getAttribute("formalParameter");
      if (value) return value;
    }
    current = current.parentNode;
  }
  return undefined;
}

function portsOf(
  element: Element,
  name: "connectionPointIn" | "connectionPointOut",
  origin: PlcPoint,
): PlcPort[] {
  return descendants(element, name).map((point) => {
    const relative = positionOf(child(point, "relPosition"));
    const formalParameter =
      point.getAttribute("formalParameter") || ancestorFormalParameter(point, element);
    return {
      ...(formalParameter ? { formalParameter } : {}),
      position: { x: origin.x + relative.x, y: origin.y + relative.y },
    };
  });
}

function textOf(element: Element, name: string): string | undefined {
  const value = child(element, name)?.textContent?.trim();
  return value || undefined;
}

function parseElement(element: Element): PlcElement | undefined {
  const kind = localName(element) as PlcElementKind;
  if (!GRAPHICAL_KINDS.has(kind)) return undefined;

  const origin = positionOf(child(element, "position"));
  const width = numberAttr(element, "width", kind.includes("PowerRail") ? 10 : 60);
  const height = numberAttr(element, "height", kind.includes("PowerRail") ? 120 : 36);
  const label =
    kind === "contact" || kind === "coil"
      ? textOf(element, "variable")
      : kind === "comment"
        ? child(element, "content")?.textContent?.trim() || undefined
        : textOf(element, "expression") ?? element.getAttribute("name") ?? undefined;
  const typeName = element.getAttribute("typeName") || undefined;
  const instanceName = element.getAttribute("instanceName") || undefined;

  return {
    localId: element.getAttribute("localId") || `anonymous-${kind}-${origin.x}-${origin.y}`,
    kind,
    bounds: { ...origin, width, height },
    ...(label ? { label } : {}),
    ...(typeName ? { typeName } : {}),
    ...(instanceName ? { instanceName } : {}),
    ...(element.hasAttribute("negated")
      ? { negated: element.getAttribute("negated") === "true" }
      : {}),
    ...(element.getAttribute("storage") ? { storage: element.getAttribute("storage")! } : {}),
    inputPorts: portsOf(element, "connectionPointIn", origin),
    outputPorts: portsOf(element, "connectionPointOut", origin),
  };
}

function calculateBounds(elements: PlcElement[]): PlcDiagram["bounds"] {
  if (elements.length === 0) return { x: 0, y: 0, width: 640, height: 320 };
  const minX = Math.min(...elements.map(({ bounds }) => bounds.x));
  const minY = Math.min(...elements.map(({ bounds }) => bounds.y));
  const maxX = Math.max(...elements.map(({ bounds }) => bounds.x + bounds.width));
  const maxY = Math.max(...elements.map(({ bounds }) => bounds.y + bounds.height));
  return {
    x: minX - 30,
    y: minY - 30,
    width: Math.max(200, maxX - minX + 60),
    height: Math.max(140, maxY - minY + 60),
  };
}

function portFor(
  element: PlcElement,
  direction: "input" | "output",
  formalParameter?: string,
): PlcPoint {
  const ports = direction === "input" ? element.inputPorts : element.outputPorts;
  const match =
    ports.find((port) => !formalParameter || port.formalParameter === formalParameter) ?? ports[0];
  if (match) return match.position;
  const { x, y, width, height } = element.bounds;
  return { x: direction === "input" ? x : x + width, y: y + height / 2 };
}

function parseDiagram(
  body: Element,
  language: "ld" | "fbd",
  pouName: string,
  diagnostics: PlcDiagnostic[],
): PlcDiagram {
  const source = child(body, language === "ld" ? "LD" : "FBD")!;
  const elements = elementChildren(source)
    .map(parseElement)
    .filter((item): item is PlcElement => Boolean(item));
  const byId = new Map<string, PlcElement>();

  for (const element of elements) {
    if (byId.has(element.localId)) {
      diagnostics.push({
        severity: "error",
        code: "LOCAL_ID_DUPLICATE",
        message: `Duplicate localId ${element.localId}.`,
        pouName,
        localId: element.localId,
      });
    }
    byId.set(element.localId, element);
  }

  const connections: PlcConnection[] = [];
  for (const targetElement of elementChildren(source)) {
    const targetId = targetElement.getAttribute("localId");
    if (!targetId) continue;
    for (const input of descendants(targetElement, "connectionPointIn")) {
      const targetFormal =
        input.getAttribute("formalParameter") || ancestorFormalParameter(input, targetElement);
      const target = byId.get(targetId);
      for (const connection of descendants(input, "connection")) {
        const sourceId = connection.getAttribute("refLocalId") || "";
        const sourceFormal = connection.getAttribute("formalParameter") || undefined;
        const sourceElement = byId.get(sourceId);
        if (!sourceElement || !target) {
          diagnostics.push({
            severity: "error",
            code: "REFERENCE_UNRESOLVED",
            message: `Connection references missing localId ${sourceId}.`,
            pouName,
            localId: sourceId,
          });
          continue;
        }
        connections.push({
          id: `${sourceId}-${targetId}-${connections.length + 1}`,
          source: {
            localId: sourceId,
            ...(sourceFormal ? { formalParameter: sourceFormal } : {}),
          },
          target: {
            localId: targetId,
            ...(targetFormal ? { formalParameter: targetFormal } : {}),
          },
          sourcePoint: portFor(sourceElement, "output", sourceFormal),
          targetPoint: portFor(target, "input", targetFormal),
          points: elementChildren(connection)
            .filter((node) => localName(node) === "position")
            .map(positionOf),
        });
      }
    }
  }

  return { language, elements, connections, bounds: calculateBounds(elements) };
}

export function parsePlcOpenXml(xml: string): ParsePlcOpenXmlResult {
  const diagnostics: PlcDiagnostic[] = [];
  if (xml.length > MAX_XML_LENGTH) {
    return {
      ok: false,
      diagnostics: [{
        severity: "error",
        code: "XML_LIMIT_EXCEEDED",
        message: "XML exceeds the 5 MB safety limit.",
      }],
    };
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    return {
      ok: false,
      diagnostics: [{
        severity: "error",
        code: "XML_INVALID",
        message: "DTD and entity declarations are not allowed.",
      }],
    };
  }

  const parserErrors: string[] = [];
  const document = new DOMParser({
    errorHandler: {
      warning: () => undefined,
      error: (message) => parserErrors.push(message),
      fatalError: (message) => parserErrors.push(message),
    },
  }).parseFromString(xml, "application/xml");
  const root = document.documentElement;

  if (!root || parserErrors.length > 0 || localName(root) !== "project") {
    return {
      ok: false,
      diagnostics: [{
        severity: "error",
        code: "XML_INVALID",
        message: parserErrors[0] ?? "The root element must be project.",
      }],
    };
  }

  const namespace = root.namespaceURI ?? "";
  if (namespace !== PLCOPEN_XML_201_NAMESPACE) {
    diagnostics.push({
      severity: "warning",
      code: "NAMESPACE_UNSUPPORTED",
      message: `Expected PLCopen XML 2.01 namespace, received ${namespace || "none"}.`,
    });
  }

  const pous: PlcPou[] = descendants(root, "pou").map((element) => {
    const name = element.getAttribute("name") || "Unnamed POU";
    const language = detectLanguage(element);
    const rawType = element.getAttribute("pouType");
    const pouType =
      rawType === "function" || rawType === "functionBlock" ? rawType : "program";

    if (language === "unsupported") {
      diagnostics.push({
        severity: "warning",
        code: "BODY_LANGUAGE_UNSUPPORTED",
        message: `POU ${name} is not LD or FBD.`,
        pouName: name,
      });
      return { name, pouType, language };
    }

    return {
      name,
      pouType,
      language,
      diagram: parseDiagram(child(element, "body")!, language, name, diagnostics),
    };
  });

  return {
    ok: true,
    document: { format: "plcopen-xml", namespace, pous, diagnostics },
  };
}

