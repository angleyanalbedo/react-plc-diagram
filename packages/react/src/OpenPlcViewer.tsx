import { useId } from "react";
import type {
  OpenPlcDiagram,
  OpenPlcNode,
  OpenPlcPin,
  OpenPlcProgram,
  OpenPlcVariant,
} from "@react-plc-diagram/core";

export interface OpenPlcViewerProps {
  program: OpenPlcProgram;
  className?: string;
}

const edgePoints = (points: { x: number; y: number }[]): string =>
  points.map((point) => point.x + "," + point.y).join(" ");

const nodeClass = (type: string, variant?: OpenPlcVariant): string =>
  "plc-node plc-" + type + (variant ? " plc-" + variant : "");

function PinView({ pin }: { pin: OpenPlcPin }) {
  const isInput = pin.side === "input";
  return (
    <g className={"plc-pin plc-pin-" + pin.side}>
      <line
        x1={pin.position.x + (isInput ? -10 : 0)}
        y1={pin.position.y}
        x2={pin.position.x + (isInput ? 0 : 10)}
        y2={pin.position.y}
      />
      <circle cx={pin.position.x} cy={pin.position.y} r="2" />
      <text
        className="plc-pin-name"
        x={pin.position.x + (isInput ? 8 : -8)}
        y={pin.position.y + 4}
        textAnchor={isInput ? "start" : "end"}
      >
        {pin.name}
      </text>
    </g>
  );
}
function BlockView({ node }: { node: OpenPlcNode }) {
  const { x, y, width, height } = node.bounds;
  const headerHeight = 23;
  const pins = node.pins ?? [];
  const pinRows = pins.length > 0 ? Math.max(...pins.map((pin) => pin.position.y)) - y : headerHeight + 18;
  const compactHeight = Math.max(headerHeight + 34, pinRows + 18);
  return (
    <g className={nodeClass("block", node.variant)} data-node-id={node.id}>
      <title>{[node.instanceName, node.typeName].filter(Boolean).join(" ")}</title>
      <rect className="plc-block-body" x={x} y={y} width={width} height={Math.min(height, compactHeight)} rx="2" />
      <line className="plc-block-header" x1={x} y1={y + headerHeight} x2={x + width} y2={y + headerHeight} />
      <text className="plc-block-type" x={x + width / 2} y={y + 16} textAnchor="middle">
        {node.typeName ?? "BLOCK"}
      </text>
      {node.instanceName && (
        <text className="plc-block-instance" x={x + width / 2} y={y - 9} textAnchor="middle">
          {node.instanceName}
        </text>
      )}
      {pins.map((pin) => <PinView key={pin.id} pin={pin} />)}
    </g>
  );
}

function VariableView({ node }: { node: OpenPlcNode }) {
  const { x, y, width, height } = node.bounds;
  return (
    <g className={nodeClass("variable", node.variant)} data-node-id={node.id}>
      <title>{[node.label, node.typeName].filter(Boolean).join(" ")}</title>
      <rect className="plc-variable-body" x={x} y={y} width={width} height={height} rx="3" />
      <text className="plc-variable-name" x={x + width / 2} y={y + 13} textAnchor="middle">
        {node.label ?? "Variable"}
      </text>
      {node.typeName && (
        <text className="plc-variable-type" x={x + width / 2} y={y + height - 6} textAnchor="middle">
          {node.typeName}
        </text>
      )}
    </g>
  );
}
function ContactView({ node }: { node: OpenPlcNode }) {
  const { x, y, width, height } = node.bounds;
  const cy = y + height / 2;
  const left = x + width * 0.34;
  const right = x + width * 0.66;
  return (
    <g className={nodeClass("contact", node.variant)} data-node-id={node.id}>
      <title>{node.label ?? "Contact"}</title>
      <line x1={x} y1={cy} x2={left} y2={cy} />
      <line className="plc-symbol" x1={left} y1={y + 2} x2={left} y2={y + height - 2} />
      <line className="plc-symbol" x1={right} y1={y + 2} x2={right} y2={y + height - 2} />
      <line x1={right} y1={cy} x2={x + width} y2={cy} />
      {node.variant === "negated" && <line className="plc-negation" x1={left + 3} y1={y + height - 5} x2={right - 3} y2={y + 5} />}
      {(node.variant === "risingEdge" || node.variant === "fallingEdge") && (
        <path
          className="plc-edge-marker"
          d={node.variant === "risingEdge" ? `M ${left - 9} ${cy + 6} l 6 -6 l -6 -6` : `M ${right + 9} ${cy - 6} l -6 6 l 6 6`}
        />
      )}
      {node.label && <text className="plc-label" x={x + width / 2} y={y - 8} textAnchor="middle">{node.label}</text>}
    </g>
  );
}

function CoilView({ node }: { node: OpenPlcNode }) {
  const { x, y, width, height } = node.bounds;
  const cy = y + height / 2;
  const left = x + width * 0.29;
  const right = x + width * 0.71;
  const marker = node.variant === "set" ? "S" : node.variant === "reset" ? "R" : node.variant === "risingEdge" ? "P" : node.variant === "fallingEdge" ? "N" : "";
  return (
    <g className={nodeClass("coil", node.variant)} data-node-id={node.id}>
      <title>{node.label ?? "Coil"}</title>
      <line x1={x} y1={cy} x2={left} y2={cy} />
      <path className="plc-symbol" d={"M " + (left + 6) + " " + (y + 2) + " Q " + (left - 5) + " " + cy + " " + (left + 6) + " " + (y + height - 2)} />
      <path className="plc-symbol" d={"M " + (right - 6) + " " + (y + 2) + " Q " + (right + 5) + " " + cy + " " + (right - 6) + " " + (y + height - 2)} />
      <line x1={right} y1={cy} x2={x + width} y2={cy} />
      {node.variant === "negated" && <line className="plc-negation" x1={left + 8} y1={y + height - 5} x2={right - 8} y2={y + 5} />}
      {marker && <text className="plc-marker" x={x + width / 2} y={cy + 4} textAnchor="middle">{marker}</text>}
      {node.label && <text className="plc-label" x={x + width / 2} y={y - 8} textAnchor="middle">{node.label}</text>}
    </g>
  );
}

function RailView({ node }: { node: OpenPlcNode }) {
  const { x, y, width, height } = node.bounds;
  const left = node.variant === "left";
  const railX = left ? x + width : x;
  return (
    <g className={nodeClass("powerRail", node.variant)} data-node-id={node.id}>
      <line className="plc-rail" x1={railX} y1={y} x2={railX} y2={y + height} />
    </g>
  );
}

function NodeView({ node, language }: { node: OpenPlcNode; language: "ld" | "fbd" }) {
  if (language === "fbd" && node.type === "variable") return <VariableView node={node} />;
  if (node.type === "block") return <BlockView node={node} />;
  if (language === "ld" && node.type === "contact") return <ContactView node={node} />;
  if (language === "ld" && node.type === "coil") return <CoilView node={node} />;
  if (language === "ld" && node.type === "powerRail") return <RailView node={node} />;
  return null;
}

function DiagramView({ diagram }: { diagram: OpenPlcDiagram }) {
  const patternId = useId().replaceAll(":", "");
  const connectedPinIds = new Set(
    diagram.edges.flatMap((edge) => [edge.source.pinId, edge.target.pinId]).filter(Boolean) as string[],
  );
  return (
    <svg viewBox={diagram.bounds.x + " " + diagram.bounds.y + " " + diagram.bounds.width + " " + diagram.bounds.height} role="img" aria-label={diagram.language.toUpperCase() + " diagram"}>
      <defs>
        <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" />
        </pattern>
      </defs>
      <rect className="plc-grid" x={diagram.bounds.x} y={diagram.bounds.y} width={diagram.bounds.width} height={diagram.bounds.height} fill={"url(#" + patternId + ")"} />
      <g className="plc-edges">
        {diagram.edges.map((edge) => <polyline key={edge.id} points={edgePoints(edge.points)} />)}
      </g>
      <g className="plc-nodes">
        {diagram.nodes.map((node) => <NodeView key={node.id} node={node} language={diagram.language} />)}
      </g>
    </svg>
  );
}

export function OpenPlcViewer({ program, className }: OpenPlcViewerProps) {
  return (
    <section className={"plc-viewer " + (className ?? "")}>
      <header className="plc-toolbar">
        <strong>{program.name}</strong>
        <span>{program.diagram.language.toUpperCase()}</span>
      </header>
      <div className="plc-canvas"><DiagramView diagram={program.diagram} /></div>
    </section>
  );
}
