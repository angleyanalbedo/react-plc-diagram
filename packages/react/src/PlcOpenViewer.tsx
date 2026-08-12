import {
  parsePlcOpenXml,
  type PlcConnection,
  type PlcDiagnostic,
  type PlcElement,
  type PlcPoint,
} from "@react-plc-diagram/core";
import { useEffect, useId, useMemo, type CSSProperties, type ReactNode } from "react";

export interface PlcOpenViewerProps {
  xml: string;
  pou?: string;
  fitView?: boolean;
  theme?: "light" | "dark" | "auto";
  className?: string;
  style?: CSSProperties;
  onDiagnostics?: (diagnostics: PlcDiagnostic[]) => void;
}

const points = (connection: PlcConnection): string =>
  [connection.sourcePoint, ...connection.points, connection.targetPoint]
    .map(({ x, y }: PlcPoint) => `${x},${y}`)
    .join(" ");

function FbdElement({ element }: { element: PlcElement }) {
  const { x, y, width, height } = element.bounds;
  if (element.kind === "comment") {
    return <g className="rpd-comment"><rect x={x} y={y} width={width} height={height} rx="4" /><text x={x + 8} y={y + 18}>{element.label}</text></g>;
  }

  if (element.kind === "block") {
    return (
      <g className="rpd-element rpd-block" data-local-id={element.localId}>
        <rect x={x} y={y} width={width} height={height} rx="3" />
        {element.instanceName && <text x={x + width / 2} y={y - 21} textAnchor="middle" className="rpd-instance">{element.instanceName}</text>}
        <text x={x + width / 2} y={y - 7} textAnchor="middle" className="rpd-block-title">{element.typeName ?? "BLOCK"}</text>
        {element.inputPorts.map((port, index) => <g key={`in-${index}`}><circle cx={port.position.x} cy={port.position.y} r="3" /><text x={port.position.x + 7} y={port.position.y + 4}>{port.formalParameter}</text></g>)}
        {element.outputPorts.map((port, index) => <g key={`out-${index}`}><circle cx={port.position.x} cy={port.position.y} r="3" /><text x={port.position.x - 7} y={port.position.y + 4} textAnchor="end">{port.formalParameter}</text></g>)}
      </g>
    );
  }

  return (
    <g className={`rpd-element rpd-variable rpd-${element.kind}`} data-local-id={element.localId}>
      <rect x={x} y={y} width={width} height={height} rx="3" />
      <text x={x + width / 2} y={y + height / 2 + 5} textAnchor="middle">{element.label ?? element.kind}</text>
      {element.inputPorts.map((port, index) => <circle key={`in-${index}`} cx={port.position.x} cy={port.position.y} r="3" />)}
      {element.outputPorts.map((port, index) => <circle key={`out-${index}`} cx={port.position.x} cy={port.position.y} r="3" />)}
    </g>
  );
}

function LdElement({ element }: { element: PlcElement }) {
  const { x, y, width, height } = element.bounds;
  const cy = y + height / 2;

  if (element.kind === "leftPowerRail" || element.kind === "rightPowerRail") {
    const railX = element.kind === "leftPowerRail" ? x + width : x;
    return <g className="rpd-ld-symbol rpd-rail" data-local-id={element.localId}><line x1={railX} y1={y} x2={railX} y2={y + height} /></g>;
  }

  if (element.kind === "contact") {
    const left = x + width * .34;
    const right = x + width * .66;
    return (
      <g className="rpd-ld-symbol" data-local-id={element.localId}>
        <line x1={x} y1={cy} x2={left} y2={cy} /><line x1={left} y1={y + 3} x2={left} y2={y + height - 3} />
        <line x1={right} y1={y + 3} x2={right} y2={y + height - 3} /><line x1={right} y1={cy} x2={x + width} y2={cy} />
        {element.negated && <line x1={left - 3} y1={y + height - 2} x2={right + 3} y2={y + 2} />}
        <text x={x + width / 2} y={y - 7} textAnchor="middle">{element.label}</text>
      </g>
    );
  }

  if (element.kind === "coil") {
    const left = x + width * .28;
    const right = x + width * .72;
    return (
      <g className="rpd-ld-symbol" data-local-id={element.localId}>
        <line x1={x} y1={cy} x2={left} y2={cy} />
        <path d={`M ${left + 6} ${y + 3} Q ${left - 5} ${cy} ${left + 6} ${y + height - 3}`} />
        <path d={`M ${right - 6} ${y + 3} Q ${right + 5} ${cy} ${right - 6} ${y + height - 3}`} />
        <line x1={right} y1={cy} x2={x + width} y2={cy} />
        {element.negated && <line x1={left + 4} y1={y + height - 2} x2={right - 4} y2={y + 2} />}
        <text x={x + width / 2} y={y - 7} textAnchor="middle">{element.label}</text>
      </g>
    );
  }

  if (element.kind === "comment") {
    return <g className="rpd-comment"><rect x={x} y={y} width={width} height={height} rx="4" /><text x={x + 8} y={y + 18}>{element.label}</text></g>;
  }

  return <FbdElement element={element} />;
}

function Diagram({ language, elements, connections }: {
  language: "ld" | "fbd";
  elements: PlcElement[];
  connections: PlcConnection[];
}) {
  return (
    <>
      <g className="rpd-connections">
        {connections.map((connection) => <polyline key={connection.id} points={points(connection)} fill="none" />)}
      </g>
      <g>{elements.map((element) => language === "ld"
        ? <LdElement key={element.localId} element={element} />
        : <FbdElement key={element.localId} element={element} />)}
      </g>
    </>
  );
}

export function PlcOpenViewer({
  xml,
  pou,
  fitView = true,
  theme = "light",
  className,
  style,
  onDiagnostics,
}: PlcOpenViewerProps) {
  const result = useMemo(() => parsePlcOpenXml(xml), [xml]);
  const diagnostics = result.ok ? result.document.diagnostics : result.diagnostics;
  const gridId = `rpd-grid-${useId().replaceAll(":", "")}`;

  useEffect(() => onDiagnostics?.(diagnostics), [diagnostics, onDiagnostics]);

  if (!result.ok) {
    return <div className={`rpd-viewer rpd-error ${className ?? ""}`} style={style}>PLCopen XML 无法解析：{diagnostics[0]?.message}</div>;
  }

  const selected =
    result.document.pous.find((item) => item.name === pou) ??
    result.document.pous.find((item) => item.language !== "unsupported");
  if (!selected?.diagram) {
    return <div className={`rpd-viewer rpd-empty ${className ?? ""}`} style={style}>没有找到可显示的 LD/FBD POU</div>;
  }

  const { bounds, elements, connections, language } = selected.diagram;
  const viewBox = `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`;

  return (
    <section className={`rpd-viewer ${className ?? ""}`} data-theme={theme} style={style}>
      <header className="rpd-toolbar">
        <div><strong>{selected.name}</strong><span>{language.toUpperCase()}</span></div>
        <span className="rpd-status">{elements.length} 个图元 · {connections.length} 条连接</span>
      </header>
      <div className="rpd-canvas">
        <svg viewBox={fitView ? viewBox : undefined} role="img" aria-label={`${selected.name} ${language} diagram`}>
          <defs><pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e7edf4" strokeWidth="0.7" /></pattern></defs>
          <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill={`url(#${gridId})`} className="rpd-grid" />
          <Diagram language={language} elements={elements} connections={connections} />
        </svg>
      </div>
      {diagnostics.length > 0 && <footer className="rpd-diagnostics">{diagnostics.map((item, index): ReactNode => <span key={index}>{item.code}</span>)}</footer>}
    </section>
  );
}

