import type { OpenPlcNode, OpenPlcPoint, OpenPlcProgram } from "@react-plc-diagram/core";

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
  return {
    id: localIdOf(element), type: "block", typeName: element.getAttribute("typeName") ?? "BLOCK",
    instanceName: element.getAttribute("instanceName") ?? undefined,
    bounds: { x: position.x, y: position.y, width: numberAttr(element, "width", 120), height: numberAttr(element, "height", 80) },
    pins: [...pinNodes(element, "inputVariables"), ...pinNodes(element, "outputVariables")],
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
    const points = children(connection, "position").map(positionOf);
    if (points.length < 2) continue;
    edges.push({
      id: `${ownerId}-${sourceId}-${edges.length}`,
      source: { nodeId: ownerIsSource ? ownerId : sourceId },
      target: { nodeId: ownerIsSource ? sourceId : ownerId, pinId: connection.getAttribute("formalParameter") ?? undefined },
      points,
    });
  }
  return edges;
}

function diagramBounds(nodes: OpenPlcNode[], edges: OpenPlcProgram["diagram"]["edges"]): { x: number; y: number; width: number; height: number } {
  const points = [...nodes.flatMap((node) => [{ x: node.bounds.x, y: node.bounds.y }, { x: node.bounds.x + node.bounds.width, y: node.bounds.y + node.bounds.height }]), ...edges.flatMap((edge) => edge.points)];
  const padding = 36;
  const minX = Math.min(...points.map((point) => point.x)) - padding;
  const minY = Math.min(...points.map((point) => point.y)) - padding;
  const maxX = Math.max(...points.map((point) => point.x)) + padding;
  const maxY = Math.max(...points.map((point) => point.y)) + padding;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function parsePlcopenFbd(xml: string): OpenPlcProgram {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("Invalid PLCopen XML");
  const fbd = Array.from(document.getElementsByTagNameNS("*", "FBD"))[0];
  if (!fbd) throw new Error("PLCopen XML does not contain an FBD body");
  const nodeElements = Array.from(fbd.children).filter((element) => ["block", "inVariable", "outVariable", "inOutVariable"].includes(element.localName));
  const nodes = nodeElements.map((element) => element.localName === "block" ? blockNode(element) : variableNode(element));
  const edges = connectionEdges(fbd);
  return { name: "Imported FBD", diagram: { language: "fbd", bounds: diagramBounds(nodes, edges), nodes, edges } };
}
