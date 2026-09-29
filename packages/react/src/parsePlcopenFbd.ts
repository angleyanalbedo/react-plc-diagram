import type { OpenPlcNode, OpenPlcPoint, OpenPlcProgram } from "@react-plc-diagram/core";
import { normalizeBlockPins, orthogonalPath } from "./fbdGeometry.js";

export interface ParsePlcopenFbdOptions {
  /** Select an FBD from a specific POU. The first FBD is used when omitted. */
  pouName?: string;
  /** Override the program name inferred from the selected POU or project. */
  name?: string;
}

export type PlcopenFbdParseErrorCode =
  | "DOM_PARSER_UNAVAILABLE"
  | "INVALID_XML"
  | "POU_NOT_FOUND"
  | "FBD_NOT_FOUND";

export class PlcopenFbdParseError extends Error {
  readonly code: PlcopenFbdParseErrorCode;

  constructor(code: PlcopenFbdParseErrorCode, message: string) {
    super(message);
    this.name = "PlcopenFbdParseError";
    this.code = code;
  }
}

const children = (element: Element, name: string): Element[] =>
  Array.from(element.children).filter((child) => child.localName === name);

const firstChild = (element: Element, name: string): Element | undefined => children(element, name)[0];

const numberAttr = (element: Element, name: string, fallback = 0): number =>
  Number(element.getAttribute(name) ?? fallback);

const positionOf = (element: Element): OpenPlcPoint => {
  const position = firstChild(element, "position");
  return { x: numberAttr(position ?? element, "x"), y: numberAttr(position ?? element, "y") };
};

const localIdOf = (element: Element): string => element.getAttribute("localId") ?? "unknown";

function variableNode(element: Element): OpenPlcNode {
  const position = positionOf(element);
  const expression = firstChild(element, "expression")?.textContent?.trim() || "?";
  return {
    id: localIdOf(element),
    type: "variable",
    label: expression,
    bounds: { x: position.x, y: position.y, width: numberAttr(element, "width", 80), height: numberAttr(element, "height", 30) },
  };
}

function pinNodes(block: Element, groupName: "inputVariables" | "outputVariables"): NonNullable<OpenPlcNode["pins"]> {
  const blockPosition = positionOf(block);
  const group = firstChild(block, groupName);
  if (!group) return [];
  return children(group, "variable").map((variable, index) => {
    const point = firstChild(firstChild(variable, "connectionPointIn") ?? firstChild(variable, "connectionPointOut") ?? variable, "relPosition");
    return {
      id: variable.getAttribute("formalParameter") ?? `${groupName}-${index}`,
      side: groupName === "inputVariables" ? "input" as const : "output" as const,
      name: variable.getAttribute("formalParameter") ?? "",
      position: { x: blockPosition.x + numberAttr(point ?? variable, "x"), y: blockPosition.y + numberAttr(point ?? variable, "y", index * 30) },
    };
  });
}

function blockNode(element: Element): OpenPlcNode {
  const position = positionOf(element);
  const bounds = {
    x: position.x,
    y: position.y,
    width: numberAttr(element, "width", 120),
    height: numberAttr(element, "height", 80),
  };
  return {
    id: localIdOf(element), type: "block", typeName: element.getAttribute("typeName") ?? "BLOCK",
    instanceName: element.getAttribute("instanceName") ?? undefined,
    bounds,
    pins: normalizeBlockPins(bounds, [...pinNodes(element, "inputVariables"), ...pinNodes(element, "outputVariables")]),
  };
}

function ownerNode(element: Element): Element | undefined {
  let current: Element | null = element;
  while (current) {
    if (["block", "inVariable", "outVariable", "inOutVariable"].includes(current.localName)) return current;
    current = current.parentElement;
  }
  return undefined;
}

function connectionEdges(fbd: Element): OpenPlcProgram["diagram"]["edges"] {
  const edges: OpenPlcProgram["diagram"]["edges"] = [];
  for (const connection of Array.from(fbd.getElementsByTagNameNS("*", "connection"))) {
    const owner = ownerNode(connection);
    const sourceId = connection.getAttribute("refLocalId");
    if (!owner || !sourceId) continue;
    const ownerIsSource = connection.parentElement?.localName === "connectionPointOut";
    const ownerId = localIdOf(owner);
    const ownerPinId = connection.parentElement?.parentElement?.getAttribute("formalParameter") ?? undefined;
    const referencedPinId = connection.getAttribute("formalParameter") ?? undefined;
    const points = children(connection, "position").map(positionOf);
    if (points.length < 2) continue;
    edges.push({
      id: `${ownerId}-${sourceId}-${edges.length}`,
      source: {
        nodeId: ownerIsSource ? ownerId : sourceId,
        pinId: ownerIsSource ? ownerPinId : referencedPinId,
      },
      target: {
        nodeId: ownerIsSource ? sourceId : ownerId,
        pinId: ownerIsSource ? referencedPinId : ownerPinId,
      },
      points,
    });
  }
  return edges;
}

function connectionPoint(
  node: OpenPlcNode | undefined,
  pinId: string | undefined,
  side: "source" | "target",
): OpenPlcPoint | undefined {
  if (!node) return undefined;
  const pin = pinId ? node.pins?.find((candidate) => candidate.id === pinId) : undefined;
  if (pin) return pin.position;
  return {
    x: side === "source" ? node.bounds.x + node.bounds.width : node.bounds.x,
    y: node.bounds.y + node.bounds.height / 2,
  };
}

function alignEdgesToNodes(
  nodes: OpenPlcNode[],
  edges: OpenPlcProgram["diagram"]["edges"],
): OpenPlcProgram["diagram"]["edges"] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  return edges.map((edge) => {
    const source = connectionPoint(nodesById.get(edge.source.nodeId), edge.source.pinId, "source");
    const target = connectionPoint(nodesById.get(edge.target.nodeId), edge.target.pinId, "target");
    return source && target ? { ...edge, points: orthogonalPath(source, target, edge.points) } : edge;
  });
}

function diagramBounds(nodes: OpenPlcNode[], edges: OpenPlcProgram["diagram"]["edges"]): { x: number; y: number; width: number; height: number } {
  const points = [...nodes.flatMap((node) => [{ x: node.bounds.x, y: node.bounds.y }, { x: node.bounds.x + node.bounds.width, y: node.bounds.y + node.bounds.height }]), ...edges.flatMap((edge) => edge.points)];
  if (points.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
  const padding = 36;
  const minX = Math.min(...points.map((point) => point.x)) - padding;
  const minY = Math.min(...points.map((point) => point.y)) - padding;
  const maxX = Math.max(...points.map((point) => point.x)) + padding;
  const maxY = Math.max(...points.map((point) => point.y)) + padding;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function parsePlcopenFbd(
  xml: string,
  options: ParsePlcopenFbdOptions = {},
): OpenPlcProgram {
  if (typeof DOMParser === "undefined") {
    throw new PlcopenFbdParseError(
      "DOM_PARSER_UNAVAILABLE",
      "parsePlcopenFbd requires a DOMParser implementation",
    );
  }
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new PlcopenFbdParseError("INVALID_XML", "Invalid PLCopen XML");
  }

  const pous = Array.from(document.getElementsByTagNameNS("*", "pou"));
  const selectedPou = options.pouName
    ? pous.find((pou) => pou.getAttribute("name") === options.pouName)
    : undefined;
  if (options.pouName && !selectedPou) {
    throw new PlcopenFbdParseError(
      "POU_NOT_FOUND",
      `PLCopen XML does not contain a POU named "${options.pouName}"`,
    );
  }

  const searchRoot: Document | Element = selectedPou ?? document;
  const fbd = Array.from(searchRoot.getElementsByTagNameNS("*", "FBD"))[0];
  if (!fbd) {
    throw new PlcopenFbdParseError("FBD_NOT_FOUND", "PLCopen XML does not contain an FBD body");
  }
  const nodeElements = Array.from(fbd.children).filter((element) => ["block", "inVariable", "outVariable", "inOutVariable"].includes(element.localName));
  const nodes = nodeElements.map((element) => element.localName === "block" ? blockNode(element) : variableNode(element));
  const edges = alignEdgesToNodes(nodes, connectionEdges(fbd));
  const contentHeader = Array.from(document.getElementsByTagNameNS("*", "contentHeader"))[0];
  const name = options.name
    ?? selectedPou?.getAttribute("name")
    ?? contentHeader?.getAttribute("name")
    ?? "Imported FBD";
  return { name, diagram: { language: "fbd", bounds: diagramBounds(nodes, edges), nodes, edges } };
}
