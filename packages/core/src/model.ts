export const PLCOPEN_XML_201_NAMESPACE = "http://www.plcopen.org/xml/tc6_0201";

export type PlcLanguage = "ld" | "fbd" | "unsupported";
export type PlcElementKind =
  | "inVariable" | "outVariable" | "inOutVariable" | "block"
  | "leftPowerRail" | "rightPowerRail" | "contact" | "coil"
  | "connector" | "continuation" | "comment";

export interface PlcPoint { x: number; y: number }
export interface PlcBounds extends PlcPoint { width: number; height: number }

export interface PlcDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  pouName?: string;
  elementName?: string;
  localId?: string;
}

export interface PlcPort {
  formalParameter?: string;
  position: PlcPoint;
}

export interface PlcElement {
  localId: string;
  kind: PlcElementKind;
  bounds: PlcBounds;
  label?: string;
  typeName?: string;
  instanceName?: string;
  negated?: boolean;
  storage?: string;
  inputPorts: PlcPort[];
  outputPorts: PlcPort[];
}

export interface PlcConnection {
  id: string;
  source: { localId: string; formalParameter?: string };
  target: { localId: string; formalParameter?: string };
  sourcePoint: PlcPoint;
  targetPoint: PlcPoint;
  points: PlcPoint[];
}

export interface PlcDiagram {
  language: Exclude<PlcLanguage, "unsupported">;
  elements: PlcElement[];
  connections: PlcConnection[];
  bounds: PlcBounds;
}

export interface PlcPou {
  name: string;
  pouType: "program" | "function" | "functionBlock";
  language: PlcLanguage;
  diagram?: PlcDiagram;
}

export interface PlcOpenDocument {
  format: "plcopen-xml";
  namespace: string;
  pous: PlcPou[];
  diagnostics: PlcDiagnostic[];
}

export type ParsePlcOpenXmlResult =
  | { ok: true; document: PlcOpenDocument }
  | { ok: false; diagnostics: PlcDiagnostic[] };

