# React PLC Diagram 开发计划

## 1. 项目目标

构建一个适合嵌入 AI 聊天窗口的 React PLC 图形组件库，支持：

- IEC 61131-3 FBD（Function Block Diagram）预览和编辑。
- IEC 61131-3 LD（Ladder Diagram）预览和编辑。
- 紧凑预览、内联展开、弹窗和侧边栏等嵌入方式。
- 节点拖拽、端口连线、属性编辑、删除、复制粘贴、撤销重做。
- JSON 导入导出、SVG 导出以及可靠的错误诊断。
- assistant-ui、普通 React 应用和 WinForms WebView2 离线环境。

该项目用于替代 Schematex 实验方案。Schematex 版本存在包体积较大、视觉效果不理想、完整编辑能力不足和 AGPL 许可证等问题。

## 2. 暂不包含的范围

首个正式版本之前不实现：

- PLC 扫描周期仿真与程序执行。
- PLC 在线状态监控和设备通信。
- ST 与 LD/FBD 的双向转换。
- 西门子、三菱、CODESYS、TwinCAT 等厂商私有工程格式。
- 完整 PLCopen XML 兼容。
- 多人实时协作。

这些能力必须建立在稳定的数据模型和编辑器 API 之上，不能阻塞 MVP。

## 3. 技术选型

- React 18/19
- TypeScript strict mode
- React Flow（`@xyflow/react`）：编辑画布、节点、端口和连线交互
- Zustand：编辑器状态、选择状态和历史记录
- Zod：运行时 Schema 校验与诊断
- Vite Library Mode：组件库构建
- Vitest：模型、校验和转换测试
- Playwright：拖拽、连线、键盘和嵌入场景测试
- Changesets：版本管理和 npm 发布
- pnpm workspace：Monorepo 管理

许可证目标为 MIT。引入依赖前必须检查许可证。

## 4. 总体架构

```text
AI / 用户 / PLCopen XML（未来）
              ↓
      稳定的 PlcDiagram JSON
              ↓
  @react-plc-diagram/core
  Schema / Validation / Layout
              ↓
  @react-plc-diagram/react
 Preview / Editor / React Flow adapter
              ↓
聊天消息 / Dialog / Side Panel / WebView2
```

关键原则：

1. 公开格式不得直接使用 React Flow 的 `Node[]`、`Edge[]`。
2. `core` 不依赖 React、DOM 或 React Flow。
3. React Flow 只是编辑器适配层，将来可以替换。
4. 预览器和编辑器分别打包，聊天首屏不加载完整编辑器。
5. FBD 与 LD 共用基础模型，但分别拥有布局和语义约束。

## 5. 建议仓库结构

```text
react-plc-diagram/
├─ packages/
│  ├─ core/
│  │  └─ src/
│  │     ├─ model/
│  │     ├─ schema/
│  │     ├─ validation/
│  │     ├─ layout/
│  │     └─ serialization/
│  ├─ react/
│  │  └─ src/
│  │     ├─ preview/
│  │     ├─ editor/
│  │     ├─ nodes/
│  │     ├─ edges/
│  │     ├─ palette/
│  │     ├─ inspector/
│  │     └─ adapters/
│  └─ markdown/
│     └─ src/
│        └─ assistant-ui/
├─ apps/
│  ├─ playground/
│  └─ docs/
├─ examples/
│  ├─ basic-react/
│  ├─ assistant-ui/
│  └─ webview2/
└─ tests/
```

## 6. 公开数据模型

第一版模型草案：

```ts
export interface PlcDiagram {
  schemaVersion: "1.0";
  id: string;
  language: "ld" | "fbd";
  title?: string;
  variables?: PlcVariable[];
  networks: PlcNetwork[];
  metadata?: Record<string, unknown>;
}

export interface PlcNetwork {
  id: string;
  title?: string;
  nodes: PlcNode[];
  connections: PlcConnection[];
}

export interface PlcNode {
  id: string;
  type: PlcNodeType;
  position?: { x: number; y: number };
  properties: Record<string, unknown>;
}

export interface PlcPortReference {
  nodeId: string;
  portId: string;
}

export interface PlcConnection {
  id: string;
  source: PlcPortReference;
  target: PlcPortReference;
}
```

需要同时定义机器可读诊断：

```ts
export interface PlcDiagnostic {
  severity: "error" | "warning";
  code: string;
  message: string;
  networkId?: string;
  nodeId?: string;
  portId?: string;
}
```

AI 应直接生成该 JSON。文本 DSL 只能作为可选适配器，不能成为内部唯一格式。

## 7. 编辑器交互设计

### 7.1 聊天窗口模式

- 默认显示紧凑只读预览。
- 自动适应消息宽度，不撑破聊天布局。
- 提供放大、适应窗口、复制 JSON、导出 SVG和“编辑”按钮。
- 点击“编辑”后可选择消息内展开、Dialog 或侧边栏。
- 编辑器必须阻止画布滚轮与聊天滚动产生冲突。
- 小屏幕和窄 WebView2 自动使用全屏编辑模式。
- 编辑器代码必须懒加载；普通文本消息不加载 React Flow。

### 7.2 编辑模式

- 左侧组件面板。
- 中央画布。
- 右侧属性面板。
- 顶部工具栏：撤销、重做、自动布局、缩放、保存、取消。
- 支持键盘删除、复制、粘贴和多选。
- 保存时调用 `onChange` / `onSave`，不在组件内部决定持久化位置。

### 7.3 宿主隔离

- 不使用无前缀全局 CSS。
- 样式使用 CSS Modules 或统一 `rpd-` 前缀。
- 颜色、尺寸和字体通过 CSS Variables 开放。
- Portal 容器可由宿主传入，不能强制挂载到 `document.body`。
- 支持暗色、亮色和宿主自定义主题。

## 8. FBD MVP

FBD 优先实现，因为它与节点/端口图模型天然匹配。

第一批节点：

- 输入变量、输出变量、常量
- AND、OR、XOR、NOT、MOVE
- ADD、SUB、MUL、DIV
- EQ、NE、GT、GE、LT、LE
- SEL、LIMIT
- TON、TOF、TP
- CTU、CTD
- R_TRIG、F_TRIG

第一批能力：

- 从面板拖入节点。
- 节点移动、选择和删除。
- 输入输出端口连线与断线。
- 属性面板修改变量、实例和参数。
- BOOL、INT、REAL、TIME 等基础类型校验。
- 从左到右的自动布局。
- JSON 导入导出与 SVG 导出。

## 9. LD MVP

第一批图元：

- 左右电源轨
- 常开触点、常闭触点
- 普通、置位和复位线圈
- 上升沿、下降沿
- 串联和并联分支
- TON、TOF、TP
- CTU、CTD
- 基础比较功能块

LD 需要专用约束：

- 一个 Network 可以包含多个 Rung。
- 电流方向固定为从左到右。
- 图元吸附到梯级网格，用户拖动的是逻辑位置而非任意像素。
- 线圈通常必须处于梯级末端。
- 并联由显式分支与汇合结构表达。
- 禁止方向错误、悬空和不合法的跨梯级连接。
- 自动布局是权威布局，保存时可以保留用户允许范围内的位置偏移。

## 10. 里程碑

### M0：仓库与工程基础

- 初始化 pnpm workspace。
- 建立 `core`、`react`、`markdown` 和 `playground`。
- 配置 TypeScript、ESLint、Vitest、Playwright、Changesets。
- 添加 MIT License、贡献指南和 CI。
- 建立 bundle size 检查。

完成标准：所有包可构建，测试和 lint 在 CI 中通过。

### M1：Core 数据模型

- 定义 JSON Schema、TypeScript 类型和 Zod Schema。
- 实现解析、版本检查、序列化和诊断。
- 编写有效/无效 LD、FBD fixtures。
- 确定 ID、端口和数据类型约定。

完成标准：Core 在 Node 和浏览器中运行且不依赖 DOM。

### M2：FBD 只读预览

- 自定义 FBD 节点和端口外观。
- JSON 到 React Flow adapter。
- 响应式预览、Fit View、明暗主题。
- 无效 JSON 的诊断回退界面。

完成标准：可嵌入 320px 宽聊天消息且不会撑破布局。

### M3：FBD 完整编辑

- 拖拽、连线、属性面板、删除和复制粘贴。
- Undo/Redo。
- 类型校验和自动布局。
- JSON 与 SVG 导出。

完成标准：可以从空画布建立并保存一个包含逻辑块、定时器和输出的网络。

### M4：LD 预览与编辑

- 梯级网格、触点、线圈和并联分支。
- LD 专用连接规则与布局。
- 编辑操作和诊断。

完成标准：可以编辑标准电机启停自锁回路并可靠地重新加载。

### M5：聊天与 WebView2 集成

- `PlcDiagramMessage` 组件。
- assistant-ui Markdown/MessagePart 适配器。
- WebView2 离线示例。
- 懒加载和滚动冲突处理。

完成标准：普通聊天不加载完整编辑器；首次编辑按需加载独立 chunk。

### M6：稳定化与发布

- 可访问性、键盘操作和错误边界。
- API 文档、示例和迁移指南。
- 性能和 bundle size 优化。
- 发布 npm prerelease。

完成标准：API 评审完成，主要交互有 Playwright 覆盖。

## 11. 版本路线

- `v0.1.0`：Core + FBD 预览
- `v0.2.0`：FBD 编辑
- `v0.3.0`：LD 基础预览和编辑
- `v0.4.0`：聊天窗口和 assistant-ui 适配
- `v0.5.0`：自动布局、完整诊断和导出
- `v1.0.0`：公开 API 稳定

## 12. 性能目标

- 普通聊天首屏不包含 React Flow 编辑器代码。
- 只读预览入口目标小于 100 KB gzip；超过时必须记录原因。
- 完整编辑器作为独立异步 chunk。
- 100 个节点的 FBD 在常见桌面 WebView2 中保持流畅拖拽。
- 任何解析或渲染错误都不能导致整条聊天消息崩溃。

## 13. 测试计划

### 单元测试

- Schema 版本与字段校验。
- 端口、数据类型和连接规则。
- LD 分支结构。
- JSON round-trip。
- React Flow adapter 不丢失领域字段。

### 组件测试

- 只读/编辑模式切换。
- 属性编辑触发受控 `onChange`。
- 无效数据展示诊断。
- 主题和窄容器布局。

### E2E 测试

- 拖入节点并连接。
- 删除、复制粘贴、撤销重做。
- 保存后重新加载保持一致。
- 聊天页面滚动与画布缩放不冲突。
- WebView2 构建产物离线加载。

## 14. MVP 验收标准

- React 18 和 React 19 均可使用。
- WebView2 中完全离线运行。
- 支持 FBD 基础节点与 LD 基础梯级编辑。
- 提供受控组件 API，不强制持久化方案。
- 提供 JSON Schema，AI 可稳定生成输入。
- 所有编辑操作可以撤销和重做。
- 无效图形显示结构化诊断而非白屏。
- 提供 assistant-ui 示例。
- 不引入 AGPL 依赖。
- 工作区测试、类型检查和构建通过。

## 15. 新会话第一步

新会话开始后按以下顺序执行：

1. 阅读本文件。
2. 完成 M0 的 Monorepo 初始化，不先写 PLC 节点 UI。
3. 在 `packages/core` 中提交数据模型 RFC 和 JSON fixtures。
4. 评审公开数据格式后再接入 React Flow。
5. 第一个可视化目标是 FBD 电机启停网络的只读预览。

