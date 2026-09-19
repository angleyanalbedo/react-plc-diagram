import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { OpenPlcProgram, OpenPlcVariant } from "@react-plc-diagram/core";
import { OpenPlcViewer } from "@react-plc-diagram/react";
import "@react-plc-diagram/react/style.css";
import "./page.css";

const ldProgram: OpenPlcProgram = {
  name: "MotorLatch",
  diagram: {
    language: "ld",
    bounds: { x: 0, y: 0, width: 520, height: 230 },
    nodes: [
      { id: "left-rail", type: "powerRail", variant: "left", bounds: { x: 24, y: 35, width: 8, height: 160 } },
      { id: "stop", type: "contact", variant: "negated", label: "Stop", bounds: { x: 80, y: 95, width: 46, height: 32 } },
      { id: "branch-top", type: "contact", variant: "normal", label: "Start", bounds: { x: 190, y: 75, width: 46, height: 32 } },
      { id: "branch-bottom", type: "contact", variant: "normal", label: "Motor", bounds: { x: 190, y: 135, width: 46, height: 32 } },
      { id: "motor", type: "coil", variant: "normal", label: "Motor", bounds: { x: 315, y: 95, width: 46, height: 32 } },
      { id: "right-rail", type: "powerRail", variant: "right", bounds: { x: 440, y: 35, width: 8, height: 160 } },
    ],
    edges: [
      { id: "left-stop", source: { nodeId: "left-rail" }, target: { nodeId: "stop" }, points: [{ x: 32, y: 111 }, { x: 80, y: 111 }] },
      { id: "stop-branch", source: { nodeId: "stop" }, target: { nodeId: "branch-top" }, points: [{ x: 126, y: 111 }, { x: 164, y: 111 }, { x: 164, y: 91 }, { x: 190, y: 91 }] },
      { id: "stop-branch-bottom", source: { nodeId: "stop" }, target: { nodeId: "branch-bottom" }, points: [{ x: 126, y: 111 }, { x: 164, y: 111 }, { x: 164, y: 151 }, { x: 190, y: 151 }] },
      { id: "top-motor", source: { nodeId: "branch-top" }, target: { nodeId: "motor" }, points: [{ x: 236, y: 91 }, { x: 275, y: 91 }, { x: 275, y: 111 }, { x: 315, y: 111 }] },
      { id: "bottom-motor", source: { nodeId: "branch-bottom" }, target: { nodeId: "motor" }, points: [{ x: 236, y: 151 }, { x: 275, y: 151 }, { x: 275, y: 111 }] },
      { id: "motor-right", source: { nodeId: "motor" }, target: { nodeId: "right-rail" }, points: [{ x: 361, y: 111 }, { x: 440, y: 111 }] },
    ],
  },
};

const fbdProgram: OpenPlcProgram = {
  name: "FBD Blocks",
  diagram: {
    language: "fbd",
    bounds: { x: 0, y: 0, width: 520, height: 300 },
    nodes: [
      { id: "ton", type: "block", typeName: "TON", instanceName: "Timer0", bounds: { x: 120, y: 30, width: 110, height: 100 }, pins: [
        { id: "in", side: "input", name: "IN", variable: "Start", position: { x: 120, y: 68 } },
        { id: "pt", side: "input", name: "PT", variable: "T#3s", position: { x: 120, y: 105 } },
        { id: "q", side: "output", name: "Q", variable: "Motor", position: { x: 230, y: 68 } },
        { id: "et", side: "output", name: "ET", variable: "Elapsed", position: { x: 230, y: 105 } },
      ] },
      { id: "and", type: "block", typeName: "AND", instanceName: "Logic0", bounds: { x: 330, y: 30, width: 100, height: 90 }, pins: [
        { id: "in1", side: "input", name: "IN1", variable: "A", position: { x: 330, y: 63 } },
        { id: "in2", side: "input", name: "IN2", variable: "B", position: { x: 330, y: 96 } },
        { id: "out", side: "output", name: "OUT", variable: "Ready", position: { x: 430, y: 80 } },
      ] },
      { id: "ctu", type: "block", typeName: "CTU", instanceName: "Counter0", bounds: { x: 120, y: 170, width: 110, height: 100 }, pins: [
        { id: "cu", side: "input", name: "CU", variable: "Pulse", position: { x: 120, y: 205 } },
        { id: "pv", side: "input", name: "PV", variable: "10", position: { x: 120, y: 242 } },
        { id: "q", side: "output", name: "Q", variable: "Done", position: { x: 230, y: 205 } },
        { id: "cv", side: "output", name: "CV", variable: "Count", position: { x: 230, y: 242 } },
      ] },
      { id: "or", type: "block", typeName: "OR", instanceName: "Logic1", bounds: { x: 330, y: 170, width: 100, height: 90 }, pins: [
        { id: "in1", side: "input", name: "IN1", variable: "Ready", position: { x: 330, y: 203 } },
        { id: "in2", side: "input", name: "IN2", variable: "Done", position: { x: 330, y: 236 } },
        { id: "out", side: "output", name: "OUT", variable: "Run", position: { x: 430, y: 220 } },
      ] },
    ],
    edges: [
      { id: "ton-and", source: { nodeId: "ton", pinId: "q" }, target: { nodeId: "and", pinId: "in1" }, points: [{ x: 230, y: 68 }, { x: 295, y: 68 }, { x: 295, y: 63 }, { x: 330, y: 63 }] },
      { id: "ctu-or", source: { nodeId: "ctu", pinId: "q" }, target: { nodeId: "or", pinId: "in2" }, points: [{ x: 230, y: 205 }, { x: 295, y: 205 }, { x: 295, y: 236 }, { x: 330, y: 236 }] },
      { id: "and-or", source: { nodeId: "and", pinId: "out" }, target: { nodeId: "or", pinId: "in1" }, points: [{ x: 430, y: 80 }, { x: 470, y: 80 }, { x: 470, y: 203 }, { x: 330, y: 203 }] },
    ],
  },
};

const ldFunctionBlockProgram: OpenPlcProgram = {
  name: "LD Function Block",
  diagram: {
    language: "ld",
    bounds: { x: 0, y: 0, width: 520, height: 190 },
    nodes: [
      { id: "left-rail", type: "powerRail", variant: "left", bounds: { x: 28, y: 20, width: 8, height: 150 } },
      { id: "start", type: "contact", variant: "normal", label: "Start", bounds: { x: 75, y: 64, width: 54, height: 32 } },
      { id: "ton", type: "block", typeName: "TON", instanceName: "Timer0", bounds: { x: 190, y: 42, width: 110, height: 90 }, pins: [
        { id: "in", side: "input", name: "IN", variable: "Start", position: { x: 190, y: 77 } },
        { id: "pt", side: "input", name: "PT", variable: "T#3s", position: { x: 190, y: 112 } },
        { id: "q", side: "output", name: "Q", variable: "Motor", position: { x: 300, y: 77 } },
      ] },
      { id: "motor", type: "coil", variant: "normal", label: "Motor", bounds: { x: 360, y: 61, width: 54, height: 32 } },
      { id: "right-rail", type: "powerRail", variant: "right", bounds: { x: 480, y: 20, width: 8, height: 150 } },
    ],
    edges: [
      { id: "rail-start", source: { nodeId: "left-rail" }, target: { nodeId: "start" }, points: [{ x: 36, y: 80 }, { x: 75, y: 80 }] },
      { id: "start-ton", source: { nodeId: "start" }, target: { nodeId: "ton", pinId: "in" }, points: [{ x: 129, y: 80 }, { x: 160, y: 80 }, { x: 160, y: 77 }, { x: 190, y: 77 }] },
      { id: "ton-motor", source: { nodeId: "ton", pinId: "q" }, target: { nodeId: "motor" }, points: [{ x: 300, y: 77 }, { x: 360, y: 77 }] },
      { id: "motor-rail", source: { nodeId: "motor" }, target: { nodeId: "right-rail" }, points: [{ x: 414, y: 77 }, { x: 480, y: 77 }] },
    ],
  },
};
type SymbolRow = { variant: OpenPlcVariant; label: string };

function makeSymbolProgram(name: string, nodeType: "contact" | "coil", rows: SymbolRow[]): OpenPlcProgram {
  const height = Math.max(230, rows.length * 52 + 34);
  const leftRailX = 28;
  const rightRailX = 492;
  const nodeX = 210;
  const nodeWidth = 64;
  const nodes = [
    { id: "left-rail", type: "powerRail" as const, variant: "left" as const, bounds: { x: leftRailX, y: 18, width: 8, height: height - 36 } },
    { id: "right-rail", type: "powerRail" as const, variant: "right" as const, bounds: { x: rightRailX, y: 18, width: 8, height: height - 36 } },
    ...rows.map((row, index) => {
      const y = 28 + index * 52;
      return { id: `${nodeType}-${row.variant}`, type: nodeType, variant: row.variant, label: row.label, bounds: { x: nodeX, y, width: nodeWidth, height: 32 } };
    }),
  ];
  const edges = rows.map((row, index) => {
    const y = 44 + index * 52;
    return [
      { id: `${row.variant}-in`, source: { nodeId: "left-rail" }, target: { nodeId: `${nodeType}-${row.variant}` }, points: [{ x: leftRailX + 8, y }, { x: nodeX, y }] },
      { id: `${row.variant}-out`, source: { nodeId: `${nodeType}-${row.variant}` }, target: { nodeId: "right-rail" }, points: [{ x: nodeX + nodeWidth, y }, { x: rightRailX, y }] },
    ];
  }).flat();
  return { name, diagram: { language: "ld", bounds: { x: 0, y: 0, width: 520, height }, nodes, edges } };
}

const contactSymbols = makeSymbolProgram("Contact Symbols", "contact", [
  { variant: "normal", label: "Normal / NO" },
  { variant: "negated", label: "Negated / NC" },
  { variant: "risingEdge", label: "Rising edge" },
  { variant: "fallingEdge", label: "Falling edge" },
]);

const coilSymbols = makeSymbolProgram("Coil Symbols", "coil", [
  { variant: "normal", label: "Normal" },
  { variant: "negated", label: "Negated" },
  { variant: "set", label: "Set" },
  { variant: "reset", label: "Reset" },
  { variant: "risingEdge", label: "Rising edge" },
  { variant: "fallingEdge", label: "Falling edge" },
]);
function App() {
  return (
    <main>
      <header className="intro">
        <p className="eyebrow">OPENPLC NODE RENDERER</p>
        <h1>从节点开始</h1>
        <p>第一阶段只验证 OpenPLC 风格的 LD 与 FBD 基础图元，不包含编辑行为。</p>
      </header>
      <section className="examples">
        <article>
          <div className="heading"><span>LD</span><h2>电机启停自锁</h2></div>
          <OpenPlcViewer program={ldProgram} />
        </article>
                <article>
          <div className="heading"><span>FBD</span><h2>多功能块</h2></div>
          <OpenPlcViewer program={fbdProgram} />
        </article>
        <article>
          <div className="heading"><span>LD</span><h2>梯形图中的功能块</h2></div>
          <OpenPlcViewer program={ldFunctionBlockProgram} />
        </article>
      </section>
      <section className="symbol-showcase">
        <div className="showcase-heading">
          <p className="eyebrow">LD SYMBOL GALLERY</p>
          <h2>所有开关与线圈类型</h2>
          <p>每一行对应一个节点变体，先确认符号形状，再进入编辑和 XML 映射。</p>
        </div>
        <div className="examples">
          <article>
            <div className="heading"><span>CONTACT</span><h2>开关 / 触点</h2></div>
            <OpenPlcViewer program={contactSymbols} className="symbol-showcase-viewer" />
          </article>
          <article>
            <div className="heading"><span>COIL</span><h2>线圈</h2></div>
            <OpenPlcViewer program={coilSymbols} className="symbol-showcase-viewer" />
          </article>
        </div>
      </section>    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
