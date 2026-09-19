export type OpenPlcLanguage = "ld" | "fbd";

export type OpenPlcNodeType =
  | "powerRail"
  | "contact"
  | "coil"
  | "block"
  | "variable"
  | "parallel";

export type OpenPlcVariant =
  | "left"
  | "right"
  | "normal"
  | "negated"
  | "set"
  | "reset"
  | "risingEdge"
  | "fallingEdge";

export interface OpenPlcPoint {
  x: number;
  y: number;
}

export interface OpenPlcBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OpenPlcPin {
  id: string;
  side: "input" | "output";
  name: string;
  variable?: string;
  position: OpenPlcPoint;
}

export interface OpenPlcNode {
  id: string;
  type: OpenPlcNodeType;
  variant?: OpenPlcVariant;
  bounds: OpenPlcBounds;
  label?: string;
  typeName?: string;
  instanceName?: string;
  pins?: OpenPlcPin[];
}

export interface OpenPlcEdge {
  id: string;
  source: { nodeId: string; pinId?: string };
  target: { nodeId: string; pinId?: string };
  points: OpenPlcPoint[];
}

export interface OpenPlcDiagram {
  language: OpenPlcLanguage;
  bounds: OpenPlcBounds;
  nodes: OpenPlcNode[];
  edges: OpenPlcEdge[];
}

export interface OpenPlcProgram {
  name: string;
  diagram: OpenPlcDiagram;
}
