import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { OpenPlcProgram } from "@react-plc-diagram/core";
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
  name: "TimerDemo",
  diagram: {
    language: "fbd",
    bounds: { x: 0, y: 0, width: 520, height: 230 },
    nodes: [{
      id: "ton",
      type: "block",
      typeName: "TON",
      instanceName: "Timer0",
      bounds: { x: 190, y: 64, width: 140, height: 112 },
      pins: [
        { id: "in", side: "input", name: "IN", variable: "Start", position: { x: 190, y: 102 } },
        { id: "pt", side: "input", name: "PT", variable: "T#3s", position: { x: 190, y: 143 } },
        { id: "q", side: "output", name: "Q", variable: "Motor", position: { x: 330, y: 102 } },
        { id: "et", side: "output", name: "ET", variable: "Elapsed", position: { x: 330, y: 143 } },
      ],
    }],
    edges: [],
  },
};

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
          <div className="heading"><span>FBD</span><h2>TON 功能块</h2></div>
          <OpenPlcViewer program={fbdProgram} />
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
