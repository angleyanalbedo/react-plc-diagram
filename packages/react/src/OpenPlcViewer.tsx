import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type {
  OpenPlcDiagram,
  OpenPlcNode,
  OpenPlcPin,
  OpenPlcProgram,
  OpenPlcVariant,
} from "@react-plc-diagram/core";
import {
  fitDiagramViewport,
  panDiagramViewport,
  resetDiagramViewport,
  resizeDiagramViewport,
  zoomDiagramViewportAt,
  type DiagramViewport,
  type ViewportSize,
} from "./viewport.js";

export interface OpenPlcViewerProps {
  /** Program model to render. LD and FBD diagrams use the same viewer. */
  program: OpenPlcProgram;
  /** Optional class name applied to the viewer root. */
  className?: string;
  /** Accessible label for the SVG diagram. Defaults to the program name and language. */
  ariaLabel?: string;
  /** Canvas height. Numbers are interpreted as CSS pixels. Defaults to 340. */
  height?: CSSProperties["height"];
  /** Initial camera mode. Defaults to fitting the complete diagram. */
  initialView?: OpenPlcInitialView;
  /** Whether to show zoom and fit controls. Defaults to true. */
  showControls?: boolean;
  /** Smallest allowed zoom factor. Defaults to 0.1. */
  minZoom?: number;
  /** Largest allowed zoom factor. Defaults to 8. */
  maxZoom?: number;
  /** Called whenever panning, zooming, fitting, or resizing changes the viewport. */
  onViewportChange?: (viewport: OpenPlcViewport) => void;
}

export type OpenPlcInitialView = "fit" | "actual-size";

export interface OpenPlcViewport {
  /** World-space x coordinate at the left side of the canvas. */
  x: number;
  /** World-space y coordinate at the top of the canvas. */
  y: number;
  /** Screen pixels per diagram unit. A value of 1 is 100%. */
  scale: number;
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
  return (
    <g className={nodeClass("block", node.variant)} data-node-id={node.id}>
      <title>{[node.instanceName, node.typeName].filter(Boolean).join(" ")}</title>
      <rect className="plc-block-body" x={x} y={y} width={width} height={height} rx="2" />
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

function DiagramView({
  diagram,
  viewport,
  size,
  ariaLabel,
}: {
  diagram: OpenPlcDiagram;
  viewport: DiagramViewport;
  size: ViewportSize;
  ariaLabel: string;
}) {
  const patternId = useId().replaceAll(":", "");
  const connectedPinIds = new Set(
    diagram.edges.flatMap((edge) => [edge.source.pinId, edge.target.pinId]).filter(Boolean) as string[],
  );
  const viewBox = [
    viewport.x,
    viewport.y,
    size.width / viewport.scale,
    size.height / viewport.scale,
  ].join(" ");
  return (
    <svg viewBox={viewBox} role="img" aria-label={ariaLabel}>
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

const sizeForBounds = (diagram: OpenPlcDiagram): ViewportSize => ({
  width: Math.max(diagram.bounds.width, 1),
  height: Math.max(diagram.bounds.height, 1),
});

interface InteractiveCanvasProps {
  diagram: OpenPlcDiagram;
  ariaLabel: string;
  height: CSSProperties["height"];
  initialView: OpenPlcInitialView;
  showControls: boolean;
  minZoom: number;
  maxZoom: number;
  onViewportChange?: (viewport: OpenPlcViewport) => void;
}

function InteractiveCanvas({
  diagram,
  ariaLabel,
  height,
  initialView,
  showControls,
  minZoom,
  maxZoom,
  onViewportChange,
}: InteractiveCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const initialSize = sizeForBounds(diagram);
  const [size, setSize] = useState<ViewportSize>(initialSize);
  const [viewport, setViewport] = useState<DiagramViewport>(() =>
    initialView === "fit"
      ? fitDiagramViewport(diagram.bounds, initialSize, 0, minZoom, maxZoom)
      : resetDiagramViewport(diagram.bounds, initialSize, minZoom, maxZoom),
  );
  const sizeRef = useRef(size);
  const viewportRef = useRef(viewport);
  const fitModeRef = useRef(initialView === "fit");
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateViewport = useCallback(
    (update: (current: DiagramViewport) => DiagramViewport) => {
      const next = update(viewportRef.current);
      viewportRef.current = next;
      setViewport(next);
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    fitModeRef.current = initialView === "fit";
    const updateSize = () => {
      const nextSize = {
        width: Math.max(canvas.clientWidth, 1),
        height: Math.max(canvas.clientHeight, 1),
      };
      const previousSize = sizeRef.current;
      sizeRef.current = nextSize;
      setSize(nextSize);
      updateViewport((current) =>
        fitModeRef.current
          ? fitDiagramViewport(diagram.bounds, nextSize, undefined, minZoom, maxZoom)
          : resizeDiagramViewport(current, previousSize, nextSize),
      );
    };

    updateSize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [diagram, initialView, maxZoom, minZoom, updateViewport]);

  useEffect(() => {
    onViewportChange?.(viewport);
  }, [onViewportChange, viewport]);

  const zoomAtCenter = (factor: number) => {
    fitModeRef.current = false;
    updateViewport((current) =>
      zoomDiagramViewportAt(
        current,
        { x: sizeRef.current.width / 2, y: sizeRef.current.height / 2 },
        factor,
        minZoom,
        maxZoom,
      ),
    );
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    fitModeRef.current = false;
    updateViewport((current) =>
      zoomDiagramViewportAt(
        current,
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
        Math.exp(-delta * 0.0015),
        minZoom,
        maxZoom,
      ),
    );
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = { x: event.clientX - drag.x, y: event.clientY - drag.y };
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    fitModeRef.current = false;
    updateViewport((current) => panDiagramViewport(current, delta));
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resetViewport = () => {
    fitModeRef.current = false;
    updateViewport(() => resetDiagramViewport(diagram.bounds, sizeRef.current, minZoom, maxZoom));
  };

  const fitViewport = () => {
    fitModeRef.current = true;
    updateViewport(() => fitDiagramViewport(diagram.bounds, sizeRef.current, undefined, minZoom, maxZoom));
  };

  return (
    <>
      {showControls && <div className="plc-viewport-controls" role="group" aria-label="Diagram zoom controls">
        <button type="button" onClick={() => zoomAtCenter(1 / 1.2)} aria-label="Zoom out" title="Zoom out">−</button>
        <button type="button" className="plc-zoom-value" onClick={resetViewport} title="Reset to 100%">
          {Math.round(viewport.scale * 100)}%
        </button>
        <button type="button" onClick={() => zoomAtCenter(1.2)} aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" className="plc-fit-button" onClick={fitViewport} title="Fit diagram to window">
          Fit
        </button>
      </div>}
      <div
        ref={canvasRef}
        className={"plc-canvas" + (isDragging ? " is-dragging" : "")}
        style={{ height }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={() => {
          dragRef.current = null;
          setIsDragging(false);
        }}
      >
        <DiagramView diagram={diagram} viewport={viewport} size={size} ariaLabel={ariaLabel} />
      </div>
    </>
  );
}

export function OpenPlcViewer({
  program,
  className,
  ariaLabel = `${program.name} ${program.diagram.language.toUpperCase()} diagram`,
  height = 340,
  initialView = "fit",
  showControls = true,
  minZoom = 0.1,
  maxZoom = 8,
  onViewportChange,
}: OpenPlcViewerProps) {
  return (
    <section className={"plc-viewer " + (className ?? "")}>
      <header className="plc-toolbar">
        <strong>{program.name}</strong>
        <span className="plc-language">{program.diagram.language.toUpperCase()}</span>
      </header>
      <InteractiveCanvas
        diagram={program.diagram}
        ariaLabel={ariaLabel}
        height={height}
        initialView={initialView}
        showControls={showControls}
        minZoom={minZoom}
        maxZoom={maxZoom}
        onViewportChange={onViewportChange}
      />
    </section>
  );
}
