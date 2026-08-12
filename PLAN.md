# React PLCopen Diagram 开发计划

## 1. 项目目标

构建一个轻量、可嵌入 React 应用的 PLCopen XML 图形查看组件，读取 PLCopen XML 2.01，并只读显示 IEC 61131-3 的：

- LD（Ladder Diagram，梯形图）
- FBD（Function Block Diagram，功能块图）

第一阶段只关注可靠解析和显示，不实现 PLC 程序编辑器。组件应能嵌入普通 React 页面、窄容器和离线 WebView；遇到不完整或暂不支持的内容时提供明确诊断，而不是白屏或导致宿主崩溃。

## 2. MVP 支持范围

- PLCopen XML 2.01 命名空间：http://www.plcopen.org/xml/tc6_0201
- 读取项目中的 POU、body 及 LD/FBD 图形
- 查询和选择 POU
- LD、FBD 基础图元及连接关系
- 使用 XML 中的坐标、尺寸和折线路径
- 缩放、平移、重置、适应窗口和响应式显示
- 亮色、暗色及宿主自定义主题
- XML 格式、引用及不支持内容的结构化诊断
- 浏览器和 WebView 中纯前端、完全离线运行

## 3. 暂不包含

- 图元创建、拖拽、删除、属性编辑和撤销重做
- PLCopen XML 写回或导出
- PLC 执行、仿真、在线监控和设备通信
- ST、IL、SFC 渲染或语言转换
- OpenPLC Editor 和其他厂商私有工程格式
- 全部厂商 addData 扩展的语义解释
- PLCopen 全工程语义验证或 IEC 61131-10 兼容认证
- 聊天框架、Markdown 和特定宿主的专用适配器

未知图元和厂商扩展应尽可能保留必要信息并产生诊断，不能阻止其余受支持内容显示。

## 4. 设计原则

1. PLCopen XML 是直接输入，不要求调用方预先转换成 JSON。
2. XML 解析、内部模型和 React 渲染相互分离。
3. core 不依赖 React、DOM 或具体渲染库。
4. 内部模型只表达查询和渲染所需信息。
5. 优先使用 XML 原始坐标和连接路径，MVP 不做自动布局。
6. 局部未知元素或损坏引用不能导致整个图形不可用。
7. 只读视图使用 SVG，不提前引入重型编辑画布依赖。
8. 公共 API 不负责文件读取、网络请求或持久化。

## 5. 总体架构

~~~text
PLCopen XML string
        ↓
安全的 XML 读取与格式检查
        ↓
PLCopen LD/FBD Parser
        ↓
Diagram IR + Diagnostics
        ↓
React SVG Viewer
~~~

解析分为两层：

- 文档层：识别命名空间、项目、POU、interface、body 和语言。
- 图形层：把 LD/FBD 图元、端点引用、坐标和连接路径转换成内部模型。

## 6. 仓库结构

~~~text
react-plc-diagram/
├─ packages/
│  ├─ core/
│  │  └─ src/
│  │     ├─ model/
│  │     ├─ parser/
│  │     ├─ diagnostics/
│  │     ├─ geometry/
│  │     └─ query/
│  └─ react/
│     └─ src/
│        ├─ viewer/
│        ├─ ld/
│        ├─ fbd/
│        ├─ primitives/
│        └─ styles/
├─ apps/
│  └─ playground/
├─ fixtures/
│  └─ plcopen-xml/
│     ├─ ld/
│     ├─ fbd/
│     └─ invalid/
└─ tests/
~~~

初期不创建无用途的空包。编辑器或宿主 adapter 仅在出现明确需求后增加。

## 7. 技术选型

- React 18/19
- TypeScript strict mode
- DOMParser 或统一的轻量 XML 解析适配层
- SVG：图元、连线、文本和视口渲染
- Zod：内部模型和公共参数的运行时校验
- Vite Library Mode
- Vitest、React Testing Library、Playwright
- pnpm workspace、Changesets

只读 MVP 不引入 React Flow、Zustand 或自动布局引擎。引入依赖前检查许可证；项目许可证目标为 MIT。

## 8. 内部模型

内部模型保存回溯到 XML 的标识，并使用可辨识联合类型表达图元。

~~~ts
export interface PlcOpenDocument {
  format: "plcopen-xml";
  namespace: string;
  pous: PlcPou[];
  diagnostics: PlcDiagnostic[];
}

export interface PlcPou {
  name: string;
  pouType: "program" | "function" | "functionBlock";
  language: "ld" | "fbd" | "unsupported";
  variables: PlcVariable[];
  diagram?: PlcDiagram;
}

export interface PlcDiagram {
  language: "ld" | "fbd";
  elements: PlcElement[];
  connections: PlcConnection[];
  bounds?: PlcBounds;
}

export interface PlcConnection {
  id: string;
  source?: PlcEndpoint;
  target: PlcEndpoint;
  points: PlcPoint[];
}

export interface PlcEndpoint {
  localId: string;
  formalParameter?: string;
}
~~~

每个 PlcElement 至少保存 localId、图元种类、位置、尺寸、显示文本、类型特有属性及必要的未知扩展信息。连接根据 refLocalId 和 formalParameter 建立；SVG 路径和 React 元素不得进入领域模型。

## 9. 诊断模型

能继续解析时返回部分结果和结构化诊断，而不是只抛出字符串错误。

~~~ts
export interface PlcDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  pouName?: string;
  localId?: string;
  elementName?: string;
}
~~~

首批诊断代码：

- XML_INVALID
- XML_LIMIT_EXCEEDED
- NAMESPACE_UNSUPPORTED
- POU_NOT_FOUND
- BODY_LANGUAGE_UNSUPPORTED
- LOCAL_ID_DUPLICATE
- REFERENCE_UNRESOLVED
- POSITION_INVALID
- ELEMENT_UNSUPPORTED
- VENDOR_EXTENSION_IGNORED

XML 完全无法读取时返回失败结果；局部问题尽量降级显示。

## 10. XML 解析范围

### 10.1 文档和 POU

- project、types、pous、pou
- POU 名称和 pouType
- interface 中渲染所需的变量
- body 下的 LD 或 FBD
- contentHeader 中与坐标系、缩放有关的信息

### 10.2 公共图形对象

- comment
- connector、continuation
- inVariable、outVariable、inOutVariable
- block
- connection 及 position 路径点

### 10.3 LD

- leftPowerRail、rightPowerRail
- contact、coil
- block
- connector、continuation、comment

触点和线圈显示变量名及可识别的 negated、edge、storage 修饰。未知修饰产生诊断。

### 10.4 FBD

- inVariable、outVariable、inOutVariable
- block
- connector、continuation、comment

功能块显示类型名、实例名、输入端、输出端和 formal parameter，并按 XML 坐标连接。

### 10.5 扩展内容

- addData 默认不解释业务语义。
- 尽可能保存扩展名称或必要原始信息，便于诊断和后续兼容。
- 厂商扩展不得覆盖标准字段的解析结果。

## 11. React 公共 API

提供 XML 高层入口和已解析图形的底层入口：

~~~tsx
<PlcOpenViewer
  xml={xmlContent}
  pou="Main"
  fitView
  theme="auto"
  onDiagnostics={handleDiagnostics}
/>
~~~

~~~tsx
const result = parsePlcOpenXml(xmlContent);
<PlcDiagramViewer diagram={result.document.pous[0].diagram} fitView />
~~~

~~~ts
export interface PlcOpenViewerProps {
  xml: string;
  pou?: string;
  fitView?: boolean;
  wheelZoom?: boolean;
  theme?: "light" | "dark" | "auto";
  className?: string;
  style?: React.CSSProperties;
  onDiagnostics?: (diagnostics: PlcDiagnostic[]) => void;
  onPouChange?: (pou: PlcPou) => void;
}
~~~

宿主负责读取文件或 URL 后传入 XML 字符串；组件不隐式访问网络或文件系统。

## 12. 显示与交互

- 鼠标或触控板平移。
- 工具栏缩放、重置和适应窗口。
- 滚轮缩放可选，默认不劫持页面滚动。
- 容器尺寸变化后保持有效视图。
- 多 POU 支持宿主受控选择。
- 空内容、不支持语言和解析失败均有明确占位状态。
- 按 XML position 点绘制折线。
- 缺少路径点时可用简单正交连线降级，并产生诊断。
- 图元提供稳定的 data-local-id。
- 不使用无前缀全局 CSS；主题通过 CSS Variables 开放。

## 13. 里程碑

### M0：工程基础

- 初始化 pnpm workspace。
- 建立 core、react 和 playground。
- 配置 TypeScript、测试、Changesets 和 CI。
- 添加 MIT License、贡献指南及 bundle size 检查。
- 检查所有直接依赖的许可证。

完成标准：所有包可构建，类型检查和测试可在 CI 中运行。

### M1：Fixtures 和解析 RFC

- 收集合法的 PLCopen XML 2.01 LD、FBD 示例。
- 增加无效 XML、错误引用、未知图元和厂商扩展示例。
- 记录 XML 元素到内部模型的映射规则。
- 确定命名空间、坐标、ID、端口和连接的处理方法。

完成标准：至少一个 LD、一个 FBD 和三个异常 fixture；评审内部模型后再开发 UI。

### M2：Core Parser

- 实现安全 XML 读取及命名空间检查。
- 提取 POU、语言、变量和图形元素。
- 解析 localId、refLocalId、formalParameter、坐标及路径点。
- 计算图形 bounds。
- 实现结构化诊断和部分成功结果。

完成标准：Core 可在 Node 测试环境和浏览器运行且不依赖 React；fixture 均有精确断言。

### M3：FBD 只读查看

- 渲染变量、功能块、端口、注释和连线。
- 实现 SVG viewport、缩放、平移及 fit view。
- 实现响应式容器、主题和诊断界面。

完成标准：真实 FBD XML 可在 320px 容器中查看，连接和 formal parameter 对应正确。

### M4：LD 只读查看

- 渲染电源轨、触点、线圈、功能块和连线。
- 显示触点及线圈的修饰与变量名。
- 处理分支、汇合和跨图元折线路径。
- 增加电机启停及并联自锁回路测试。

完成标准：真实 LD XML 可正确呈现串联、并联、电源轨、触点和线圈关系。

### M5：稳定化与发布

- 完善键盘操作、焦点和无障碍说明。
- 验证 React 18/19 和离线 WebView。
- 完善 API 文档、示例及兼容性矩阵。
- 优化性能及 bundle size，发布 npm prerelease。

完成标准：API 通过评审，核心解析和主要交互有自动化测试覆盖。

## 14. 测试计划

### 单元测试

- 有效和无效 XML
- 默认及带前缀的命名空间
- LD/FBD POU 识别与选择
- 坐标、尺寸和 bounds
- localId 唯一性及 refLocalId 引用
- formalParameter 与功能块端口映射
- 折线路径点顺序
- 未知图元、addData 及局部损坏诊断

### 组件与 E2E 测试

- XML 解析后渲染对应 SVG 图元
- POU 受控切换及 onDiagnostics 回调
- 错误和不支持语言状态
- fit view、主题、缩放和平移
- 320px 窄容器和页面滚动
- 不污染宿主样式
- 生产构建完全离线加载

## 15. 性能、可靠性与安全

- Viewer 入口目标小于 100 KB gzip；超出时记录原因。
- 100 个图元的单图在常见桌面浏览器和 WebView 中保持流畅。
- 相同 XML 产生确定性的内部模型和 SVG。
- 解析或渲染错误不能导致宿主页面崩溃。
- 拒绝 DTD 和外部实体，防止 XXE。
- 不使用 dangerouslySetInnerHTML 渲染 XML 文本。
- 对 XML 大小、元素数量和连接点数量设置可配置上限。
- 不执行 XML 中的脚本或加载外部资源。

## 16. MVP 验收标准

- React 18 和 React 19 均可使用。
- 接收 PLCopen XML 2.01 字符串并识别 LD/FBD POU。
- 可选择和显示指定 POU。
- 支持首批 LD/FBD 标准图元、端口和连线。
- 优先保持 XML 原始位置和折线路径。
- 支持缩放、平移、适应窗口和响应式容器。
- 无效 XML、损坏引用及未知图元产生结构化诊断而非白屏。
- 浏览器和 WebView 可完全离线运行。
- 不引入 AGPL/GPL 运行时依赖。
- 工作区测试、类型检查和构建通过。

## 17. 版本路线

- v0.1.0：Core Parser + FBD 基础查看
- v0.2.0：LD 基础查看
- v0.3.0：诊断、主题、交互和兼容性完善
- v0.4.0：更多标准图元和厂商兼容修正
- v1.0.0：稳定 API 和明确的 PLCopen XML 2.01 支持矩阵

编辑、XML 写回、其他 PLCopen 版本或厂商 adapter 应作为后续独立提案。

## 18. 下一步

1. 完成 M0 工程初始化，不先写图元 UI。
2. 提交最小 LD、FBD 和异常 XML fixtures。
3. 编写内部模型与 XML 映射 RFC。
4. 实现并测试 Core Parser。
5. 首个可视化目标是 FBD 基础网络的只读 SVG 预览。

## 19. 原型结论与下一阶段

当前基线已经验证：

- pnpm workspace、Core、React 和 playground 可以独立构建。
- PLCopen XML 2.01 的 POU、LD/FBD、基础图元、端口与连接可以解析。
- FBD 与 LD fixtures 可以渲染为只读 SVG。
- 无效命名空间和悬空引用可以产生结构化诊断。

SVG 原型只保留为轻量预览入口。下一阶段的核心目标调整为现代化 PLCopen XML 编辑器：公开输入和输出继续使用 PLCopen XML，交互画布采用成熟的节点编辑能力，PLC 语义、XML 映射和诊断仍由本项目负责。

### E0：视觉与交互规范

- 定义现代工业风格的颜色、间距、字体、端口、连线和选中状态。
- 制作 FBD、LD、工具栏、元件面板和属性面板的静态样稿。
- 明确查看模式与编辑模式的组件 API。

完成标准：基础 FBD 和电机自锁 LD 均有经过评审的界面样稿，不直接在现有原型样式上堆叠功能。

### E1：可编辑画布基础

- 评估并接入 React Flow 作为内部画布层。
- 建立 Diagram IR 与画布节点/边之间的双向 adapter。
- 支持选择、平移、缩放、节点拖拽、删除和撤销重做。
- 保持公开 API 不暴露 React Flow 的 Node/Edge 类型。

完成标准：导入 FBD XML 后可以移动功能块，领域字段不丢失。

### E2：FBD 编辑

- 实现现代 FBD 变量、功能块和端口组件。
- 支持创建、连接、断线、属性修改及基础类型检查。
- 支持元件面板和属性面板。

完成标准：可以从空画布建立 Start/Safe/AND/Motor 网络。

### E3：PLCopen XML 写回

- 实现位置、尺寸、图元、端口和连接的确定性序列化。
- 保留未修改的标准字段和厂商扩展。
- 增加 parse → edit → serialize → parse round-trip 测试。

完成标准：编辑后导出的 XML 可以重新载入，并保持相同逻辑和布局。

### E4：LD 编辑

- 实现梯级网格、电源轨、触点、线圈和功能块。
- 支持串联、并联分支及汇合。
- 加入 LD 专用合法性约束和诊断。

完成标准：可以创建、编辑并导出电机启停自锁回路。

### E5：稳定化

- 完善键盘操作、复制粘贴、主题和窄容器体验。
- 建立组件测试、E2E、兼容性 fixtures 和 bundle size 检查。
- 发布可编辑版本 prerelease。

