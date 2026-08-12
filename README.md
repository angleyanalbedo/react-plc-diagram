# React PLC Diagram

一个面向 AI 聊天窗口的 React PLC 图形组件，目标是提供可嵌入、可预览、可拖拽编辑的 IEC 61131-3 LD（梯形图）和 FBD（功能块图）。

项目当前处于规划阶段。详细范围、架构、里程碑和验收标准见 [PLAN.md](./PLAN.md)。

## 核心方向

- 聊天消息内提供轻量、响应式的只读预览。
- 点击后可在消息内、弹窗或侧边栏进入完整编辑模式。
- 支持节点拖拽、端口连线、属性编辑、删除、复制粘贴和撤销重做。
- 使用独立于 React Flow 的稳定 PLC JSON 模型。
- 优先支持 FBD，再支持带网格约束的 LD。
- 面向 React 18/19、assistant-ui 和 WinForms WebView2。
- 计划采用 MIT 许可证，避免 AGPL 类依赖进入核心实现。

## 新会话接手

在新的开发会话中，请先阅读 `PLAN.md`，从“里程碑 M0”开始执行。不要直接把 React Flow 的 `Node[]` 和 `Edge[]` 作为公开数据格式。

