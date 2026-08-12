import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlcOpenViewer } from "@react-plc-diagram/react";
import "@react-plc-diagram/react/style.css";
import fbdXml from "../../../fixtures/plcopen-xml/fbd/basic-logic.xml?raw";
import ldXml from "../../../fixtures/plcopen-xml/ld/motor-latch.xml?raw";
import "./page.css";

function App() {
  return (
    <main>
      <div className="intro">
        <p className="eyebrow">LIVE PLCOPEN XML VIEWER</p>
        <h1>React PLCopen Diagram</h1>
        <p>同一套解析器和 SVG 渲染器，直接显示 PLCopen XML 2.01 中的 FBD 与 LD。</p>
      </div>

      <div className="examples">
        <article>
          <div className="example-heading">
            <div><span>FBD</span><h2>基础逻辑网络</h2></div>
            <code>fbd/basic-logic.xml</code>
          </div>
          <PlcOpenViewer xml={fbdXml} pou="BasicLogic" theme="light" />
        </article>

        <article>
          <div className="example-heading">
            <div><span>LD</span><h2>电机启停自锁</h2></div>
            <code>ld/motor-latch.xml</code>
          </div>
          <PlcOpenViewer xml={ldXml} pou="MotorLatch" theme="light" />
        </article>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

