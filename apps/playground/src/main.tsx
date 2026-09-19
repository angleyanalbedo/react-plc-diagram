import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { OpenPlcProgram, OpenPlcVariant } from "@react-plc-diagram/core";
import { OpenPlcViewer, parsePlcopenFbd } from "@react-plc-diagram/react";
import "@react-plc-diagram/react/style.css";
import "./page.css";
import paperMachineXml from "../../../fixtures/plcopen-xml/complex/paper-machine.xml?raw";

const importedFbdProgram = parsePlcopenFbd(paperMachineXml);

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
  name: "FBD Timer",
  diagram: {
    language: "fbd",
    bounds: { x: 0, y: 0, width: 520, height: 230 },
    nodes: [
      { id: "start", type: "variable", label: "Start", typeName: "BOOL", bounds: { x: 24, y: 58, width: 82, height: 30 } },
      { id: "preset", type: "variable", label: "T#3s", typeName: "TIME", bounds: { x: 24, y: 112, width: 82, height: 30 } },
      { id: "ton", type: "block", typeName: "TON", instanceName: "Timer0", bounds: { x: 190, y: 48, width: 110, height: 100 }, pins: [
        { id: "in", side: "input", name: "IN", position: { x: 190, y: 82 } },
        { id: "pt", side: "input", name: "PT", position: { x: 190, y: 117 } },
        { id: "q", side: "output", name: "Q", position: { x: 300, y: 82 } },
        { id: "et", side: "output", name: "ET", position: { x: 300, y: 117 } },
      ] },
      { id: "motor", type: "variable", label: "Motor", typeName: "BOOL", bounds: { x: 372, y: 58, width: 82, height: 30 } },
      { id: "elapsed", type: "variable", label: "Elapsed", typeName: "TIME", bounds: { x: 372, y: 112, width: 82, height: 30 } },
    ],
    edges: [
      { id: "start-in", source: { nodeId: "start" }, target: { nodeId: "ton", pinId: "in" }, points: [{ x: 106, y: 73 }, { x: 145, y: 73 }, { x: 145, y: 82 }, { x: 190, y: 82 }] },
      { id: "preset-pt", source: { nodeId: "preset" }, target: { nodeId: "ton", pinId: "pt" }, points: [{ x: 106, y: 127 }, { x: 145, y: 127 }, { x: 145, y: 117 }, { x: 190, y: 117 }] },
      { id: "q-motor", source: { nodeId: "ton", pinId: "q" }, target: { nodeId: "motor" }, points: [{ x: 300, y: 82 }, { x: 340, y: 82 }, { x: 340, y: 73 }, { x: 372, y: 73 }] },
      { id: "et-elapsed", source: { nodeId: "ton", pinId: "et" }, target: { nodeId: "elapsed" }, points: [{ x: 300, y: 117 }, { x: 340, y: 117 }, { x: 340, y: 127 }, { x: 372, y: 127 }] },
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
        { id: "in", side: "input", name: "IN", variable: "Start", position: { x: 190, y: 80 } },
        { id: "pt", side: "input", name: "PT", variable: "T#3s", position: { x: 190, y: 112 } },
        { id: "q", side: "output", name: "Q", variable: "Motor", position: { x: 300, y: 80 } },
      ] },
      { id: "motor", type: "coil", variant: "normal", label: "Motor", bounds: { x: 360, y: 64, width: 54, height: 32 } },
      { id: "right-rail", type: "powerRail", variant: "right", bounds: { x: 480, y: 20, width: 8, height: 150 } },
    ],
    edges: [
      { id: "rail-start", source: { nodeId: "left-rail" }, target: { nodeId: "start" }, points: [{ x: 36, y: 80 }, { x: 75, y: 80 }] },
      { id: "start-ton", source: { nodeId: "start" }, target: { nodeId: "ton", pinId: "in" }, points: [{ x: 129, y: 80 }, { x: 190, y: 80 }] },
      { id: "ton-motor", source: { nodeId: "ton", pinId: "q" }, target: { nodeId: "motor" }, points: [{ x: 300, y: 80 }, { x: 360, y: 80 }] },
      { id: "motor-rail", source: { nodeId: "motor" }, target: { nodeId: "right-rail" }, points: [{ x: 414, y: 80 }, { x: 480, y: 80 }] },
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
          <OpenPlcViewer program={importedFbdProgram} className="imported-fbd" />
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
