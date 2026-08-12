# React PLC Diagram

一个轻量的 React PLCopen XML 2.01 图形查看组件，用于解析并只读显示 IEC 61131-3 LD（梯形图）和 FBD（功能块图）。

项目当前处于工程骨架阶段。详细范围、架构、里程碑和验收标准见 [PLAN.md](./PLAN.md)。

## 核心方向

- 直接接收 PLCopen XML 字符串。
- Core Parser 与 React SVG Viewer 相互独立。
- 优先支持 FBD，再支持 LD。
- 保留原始坐标和连接路径，输出结构化诊断。
- 面向 React 18/19 和离线 WebView。
- 计划采用 MIT 许可证，避免 GPL 类运行时依赖。

## 新会话接手

在新的开发会话中，请先阅读 `PLAN.md`，按 fixtures、解析 RFC、Core Parser 和 SVG Viewer 的顺序推进。
