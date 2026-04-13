# XYFlow Webview 重构设计

**日期：** 2026-04-13  
**目标：** 用 `React + @xyflow/react` 重建 VS Code Webview 里的图编辑层，在保持现有 `.flow` / `.flow.layout.json` 格式兼容的前提下，提供更稳定的拖拽、改名、新增节点、新增连线能力。

---

## 1. 背景与结论

当前原型已经验证了核心方向可行：

- 项目内源文件可直接打开
- `.flow` 与 `.flow.layout.json` 双文件模型可工作
- 拖拽和改名可以双向同步

当前瓶颈不在数据层，而在渲染层：

- `renderGraphHtml.js` 采用整页 HTML 字符串 + 内联脚本
- 图更新依赖 `svg.innerHTML` 全量重建
- Webview 逻辑和渲染细节耦合过高
- 继续叠加结构编辑会迅速增加维护成本

这次重构的结论是：

- **保留现有 DSL、layout sidecar、graph model、extension host 的职责划分**
- **替换 Webview 图编辑层为 `React + XYFlow`**
- **第一版重构完成后即支持：拖拽、改名、新增节点、新增连线**

---

## 2. 设计目标

### 必须满足

- 保持现有 `.flow` 文件格式兼容
- 保持现有 `.flow.layout.json` 文件格式兼容
- VS Code 插件宿主不变，继续从项目内文件直接打开
- 用户仍然保持“左边源码、右边图编辑”的使用方式
- 图编辑器支持：
  - 拖拽节点
  - 改节点文字
  - 新增节点
  - 新增连线
- 所有编辑都能稳定回写到文件

### 明确不做

- 独立桌面应用
- 改动 DSL 基本语法
- 手工调折线拐点
- 手工调 handle 精细位置
- 完整 undo/redo
- 多选、框选、复制粘贴

---

## 3. 整体架构

```text
.flow / .flow.layout.json
        |
        v
extension host
(load / save / sync)
        |
        v
documentModel
(graph + layout + sourceText)
        |
        v
webview app (React)
        |
        v
XYFlow canvas
```

### 分层职责

#### A. 文件层

- `.flow`
  - 存节点、边、标签、方向
- `.flow.layout.json`
  - 存节点位置和尺寸

#### B. 宿主层

继续由 VS Code extension host 负责：

- 读取 `.flow`
- 读取 `.flow.layout.json`
- 解析为 `documentModel`
- 接收 Webview 发来的变更消息
- 把结构变更写回 `.flow`
- 把布局变更写回 `.flow.layout.json`

宿主层**不直接持有 XYFlow 的内部状态结构**。

#### C. Webview 前端层

改为一个真正的前端应用，而不是拼接字符串：

- React 负责状态和组件树
- XYFlow 负责节点/边渲染与交互
- Webview 内部状态只服务于 UI 编辑过程
- Webview 不直接操作磁盘

#### D. 中间模型层

`documentModel` 继续作为唯一的跨层中间模型：

```text
documentModel = {
  sourcePath,
  layoutPath,
  sourceText,
  graph,
  layout
}
```

这层是文件格式和编辑器之间的桥。  
**source of truth 仍然是文件，不是 XYFlow。**

---

## 4. 前端组件设计

建议拆成下面这些模块：

```text
src/webview-app/
  main.tsx
  App.tsx
  state/editorStore.ts
  mapping/toFlowNodes.ts
  mapping/toFlowEdges.ts
  mapping/fromNodePositionChanges.ts
  mapping/fromConnectEvent.ts
  components/FlowCanvas.tsx
  components/TopToolbar.tsx
  components/InspectorPanel.tsx
  components/nodes/DiagramNode.tsx
  bridge/vscodeBridge.ts
```

### 核心组件

#### `App`

- 接收宿主注入的初始 `documentModel`
- 组装顶部工具栏、XYFlow 画布、右侧轻量编辑控件

#### `FlowCanvas`

- 渲染 `ReactFlow`
- 挂载 `nodes` / `edges`
- 处理：
  - `onNodesChange`
  - `onEdgesChange`
  - `onConnect`
  - `onNodeClick`

#### `TopToolbar`

- 新增节点
- 自动布局
- 显示当前选中节点

#### `InspectorPanel`

- 改节点文字
- 未来可扩展节点属性

#### `DiagramNode`

- 作为 XYFlow 自定义节点
- 统一视觉样式
- 统一 handles

---

## 5. 数据映射规则

### graph -> XYFlow

#### 节点映射

`graph.nodes + layout.nodes[id]` 映射为 XYFlow `Node[]`：

- `id` -> `node.id`
- `label` -> `node.data.label`
- `layout.x/y` -> `node.position`
- `layout.w/h` -> `node.style.width/height`

#### 边映射

`graph.edges` 映射为 XYFlow `Edge[]`：

- `from` -> `edge.source`
- `to` -> `edge.target`
- `label` -> `edge.label`
- `id` 使用稳定规则生成，例如：
  - 有显式 edge id 时优先用显式 id
  - 否则使用 `source->target#index`

### XYFlow -> documentModel

#### 拖拽节点

- 从 `onNodesChange` 里提取 position 变化
- 只更新 `layout.nodes[id].x/y`
- 写回 `.flow.layout.json`

#### 改名

- 只更新 `graph.nodes[id].label`
- 通过 `serializeDiagram(graph)` 写回 `.flow`

#### 新增节点

- 生成稳定节点 id
- 插入 `graph.nodes`
- 在 `layout.nodes` 中生成默认位置
- 写回 `.flow` 和 `.flow.layout.json`

#### 新增连线

- 由 XYFlow `onConnect` 触发
- 映射为 `{ from, to, label? }`
- 插入 `graph.edges`
- 写回 `.flow`

---

## 6. 第一版交互定义

### 6.1 拖拽节点

- 允许直接拖拽
- 拖拽完成后写回布局文件
- 拖拽过程由 XYFlow 自带交互承担

### 6.2 改节点文字

- 点击节点后在右侧编辑面板显示当前节点信息
- 编辑文字并提交后：
  - 更新 XYFlow 节点显示
  - 更新 `graph`
  - 写回 `.flow`

### 6.3 新增节点

- 顶部按钮 `新增节点`
- 默认创建：
  - 新 id
  - 默认 label，如 `新节点`
  - 默认位置：当前视口中心附近或最后一个节点右侧
- 创建后立即选中，便于改名

### 6.4 新增连线

- 使用 XYFlow handle 拖拽建立连接
- 新边创建后立即写回 `.flow`
- 第一版不支持边标签编辑

### 6.5 自动布局

- 第一版可保留现有简化策略
- 作用是“重新整理节点位置”，不是高质量自动布线系统
- 自动布局只写回 `.flow.layout.json`

---

## 7. 文件兼容策略

这次重构不改现有格式：

### `.flow`

继续支持：

```text
dir LR

node start "开始"
node review "审批"

edge start -> review
edge review -> done "通过"
```

### `.flow.layout.json`

继续支持：

```json
{
  "nodes": {
    "start": { "x": 80, "y": 120, "w": 140, "h": 56 }
  }
}
```

如果 XYFlow 额外产生了视口、缩放、选中态等运行时状态，**第一版不写回文件**。

---

## 8. 消息桥设计

宿主与 Webview 之间采用显式消息，不共享实现细节。

### 宿主 -> Webview

- `loadDocument`
  - 首次注入完整 `documentModel`
- `syncDocument`
  - 文件重写后推送最新 `documentModel`
- `hostDebug`
  - 调试信息

### Webview -> 宿主

- `moveNodes`
  - 节点位置变化
- `renameNode`
  - 节点文字变化
- `createNode`
  - 新增节点
- `createEdge`
  - 新增边
- `requestAutoLayout`
  - 请求宿主执行布局整理
- `webviewReady`
  - 握手与调试

---

## 9. 错误处理

### Webview 侧

- 消息发送失败时显示明确错误状态
- 当前编辑失败时不静默吞错
- 不允许前端临时状态悄悄覆盖文件状态

### 宿主侧

- 解析失败时提示用户源文件有误
- 写回失败时在 output channel 和 UI 都给出提示
- 任何失败都不应把 `.flow` / `.layout.json` 写成半成品

---

## 10. 测试策略

### 保留现有单元测试

- parser
- serializer
- layout preservation

### 新增测试

- graph <-> XYFlow node mapping
- graph <-> XYFlow edge mapping
- createNode 变更能正确写回 `.flow`
- createEdge 变更能正确写回 `.flow`
- 拖拽后位置写回 `.layout.json`

### 最低手动验证清单

1. 打开现有 `example.flow`
2. 预览正常渲染
3. 拖动节点后 layout 文件变化
4. 改名后 `.flow` 文件变化
5. 新增节点后 `.flow` 与 `.layout.json` 都变化
6. 新增连线后 `.flow` 变化

---

## 11. 风险与取舍

### 风险 1：引入构建链

- Webview 前端从零依赖脚本切到 React 工程
- 需要处理 VS Code Webview 资源路径与打包产物

**取舍：** 这是必要复杂度，换来的是可维护的交互层。

### 风险 2：XYFlow 内部状态和文件状态脱节

- 前端可能出现临时状态与磁盘状态不一致

**取舍：** 强制以 `documentModel` 为中间层，不直接把 XYFlow state 当 source of truth。

### 风险 3：新增连线的 DSL 回写规则不稳

- 特别是后续 edge label、重复边、边顺序问题

**取舍：** 第一版先支持基础边，不扩展复杂 edge 属性。

---

## 12. 最终判断

这次重构不是推翻原项目，而是**替换图编辑器实现层**。

保留：

- DSL
- sidecar layout
- parser / serializer
- extension host 文件同步逻辑

替换：

- Webview 渲染和交互层

推荐路径：

**`React + XYFlow Webview App + 兼容现有文件格式 + 第一版一起支持结构编辑`**

这是当前最合理的重构边界。

---

## 参考资料

- React Flow / XYFlow 官方文档
  - https://reactflow.dev/api-reference/react-flow
  - https://reactflow.dev/learn/getting-started/adding-interactivity
  - https://reactflow.dev/learn/customization/handles
  - https://reactflow.dev/examples/interaction/save-and-restore/
- VS Code Webview 官方文档
  - https://code.visualstudio.com/api/extension-guides/webview
