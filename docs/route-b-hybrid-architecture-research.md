# Route B Hybrid Architecture Research

Date: 2026-04-16

## Goal

把当前项目从：

`.flow -> graph -> dagre -> post-layout -> XYFlow`

升级成一条更接近 Mermaid 的混合架构，同时保留现有 VS Code Custom Editor、`.flow` DSL 和交互体验。

这份文档回答 4 个核心问题：

1. 中间语义层（IR）应该长什么样
2. Layout pipeline 应该怎么分层
3. Routing pipeline 应该独立到什么程度
4. XYFlow 应该保留到什么边界

结论先写在前面：

- `Route B` 是合理主线
- 最值得做的是把“图模型”升级成 `IR + layout result + routing result` 三层
- XYFlow 可以保留，但应该降级为“交互壳”，而不是几何真相来源
- 真正的 Mermaid-like 提升，不在继续堆 post-layout patch，而在把 `group`、`cross-group edge`、`label` 变成一等布局/路由实体

## Current State

当前仓库已经具备：

- `.flow` DSL、parser、serialize、edit helpers
- `group`、`node type`、`edge style`、runtime edge id
- Dagre 基础布局
- Mermaid-like post-layout：
  - primary-flow rank ordering
  - group-first / banded layout
  - group-local rows
  - edge label dummy node
  - final label realignment
  - TD smooth-step preference

当前真正的瓶颈不是“某个算法还不够聪明”，而是架构边界仍然混在一起：

- `graph` 同时承担语义数据和布局输入
- `layout` 同时承担节点几何、部分 label 几何，但不表达更高层的 group/port/routing intent
- edge path 仍主要在 renderer 内即时生成
- group 是“布局后推导出的盒子”，还不是一等布局对象

这会带来几个上限：

- `group` 很难真正像 Mermaid subgraph 那样参与布局
- 跨组边只能做局部修补，无法稳定表达“从 group boundary 进出”
- label 很难成为 routing 体系的一部分
- XYFlow path helper 的能力边界，会反过来限制布局表达

## Mermaid Reference Model

基于 Mermaid flowchart 的现有实现调研，可以提炼出几个对 Route B 最关键的事实：

### 1. Mermaid 有一层明确的中间数据库和标准化布局输入

Mermaid 不是 parser 直接产出渲染图，而是：

`Parser -> FlowDB -> LayoutData -> Layout Engine -> SVG Renderer`

FlowDB 至少保存：

- vertices / nodes
- edges
- subgraphs / groups
- label text and label type
- node shape
- edge style / curve / arrow metadata
- parent-child hierarchy

然后再统一转换成面向布局和渲染的 `LayoutData`。

这说明：**IR 不只是“为了优雅”，而是 Mermaid-like 行为的必要前提。**

### 2. cluster / subgraph 是一等布局实体

Mermaid 的 flowchart subgraph 不是事后画框，而是布局流程的一部分。
这意味着：

- group 有真实的层级语义
- group 有自己的尺寸和 title margin
- group 与 group 之间的连接会影响布局

对我们来说，这直接指向：**Route B 不能只保留现在的 groupNode 推导模型。**

### 3. edge routing 与 edge rendering 不是一回事

Mermaid 把 layout engine 产出的 edge 几何，和最终 SVG edge 渲染区分开处理：

- layout engine 决定主要路径、sections/bend points
- renderer 决定 curve、label transform、clipping、视觉细节

这说明：**我们也需要单独的 routing result，而不是继续把 path 生成混在 edge component 里。**

### 4. Mermaid 的布局与渲染是分层的，SVG/D3 主要绑定在最后一层

Mermaid 的 parser、LayoutData、layout engine 是 renderer-agnostic 的；
真正耦合 SVG/D3 的，是最终 shape/edge/group 的绘制层。

这对我们非常关键：

- 我们不必放弃 XYFlow
- 但 XYFlow 应该只消费我们自己的 geometry
- 不能继续让 XYFlow 的 path helper 主导路由语义

## Proposed Route B Architecture

推荐把系统拆成 5 层：

1. `Source Layer`
2. `Semantic IR Layer`
3. `Layout Layer`
4. `Routing Layer`
5. `Renderer/Interaction Layer`

整体流程建议改成：

`source (.flow)`
-> `semantic graph / IR`
-> `layout graph`
-> `layout result`
-> `routing result`
-> `view model`
-> `XYFlow renderer`

### Layer 1: Source Layer

职责：

- `.flow` parser
- `.flow` serializer
- 文本编辑与语义编辑的 round-trip

约束：

- 不在这一层引入布局字段
- 不把 renderer-specific 字段写回 source

### Layer 2: Semantic IR Layer

这是 Route B 的核心。

建议新增一个稳定 IR，至少包含下面 4 类对象：

#### `DiagramIR`

```js
{
  direction: 'TD' | 'LR',
  nodes: NodeIR[],
  edges: EdgeIR[],
  groups: GroupIR[],
  meta: {
    sourcePath,
    version,
  },
}
```

#### `NodeIR`

```js
{
  id,
  label,
  labelType: 'plain',
  type: 'default' | 'decision' | 'start' | 'end' | 'input',
  groupId: string | null,
  style: {
    color: string | null,
  },
}
```

#### `EdgeIR`

```js
{
  id,
  from,
  to,
  label: string | null,
  style: {
    pattern: 'solid' | 'dashed' | 'dotted' | 'dashdot',
  },
  semantic: {
    isCrossGroup: boolean,
  },
}
```

#### `GroupIR`

```js
{
  id,
  label,
  parentGroupId: string | null,
  childNodeIds: string[],
}
```

补充说明：

- 这个 IR 是“语义真相”
- 不包含 `x/y/w/h/path`
- 不包含 XYFlow `position/sourcePosition/targetPosition`
- 也不包含直接的 SVG path

### Layer 3: Layout Layer

这一层只回答：

- group 在哪里
- node 在哪里
- label box 大小大致是多少

不回答：

- 边最终怎么画
- path 的拐点长什么样

建议输出 `LayoutResult`：

```js
{
  groups: {
    [groupId]: { x, y, w, h }
  },
  nodes: {
    [nodeId]: { x, y, w, h }
  },
  edgeLabels: {
    [edgeId]: { x, y, w, h }
  },
  anchors: {
    [nodeId]: {
      top?: { x, y },
      right?: { x, y },
      bottom?: { x, y },
      left?: { x, y },
    }
  }
}
```

布局流程建议拆成 3 个阶段：

#### Phase A: Group Layout

- 构建 group DAG
- 计算 group band / rank / row
- 如果后续支持嵌套 group，则递归计算 group 内局部坐标系

#### Phase B: Local Node Layout

- 每个 group 内单独做 local layout
- 可继续使用 Dagre 作为 local ranker
- 组外自由节点可作为一个“root band”处理

#### Phase C: Layout Assembly

- 合并 group 坐标与 local node 坐标
- 生成全局 `nodes/groups/edgeLabels`
- 生成用于 routing 的 anchor candidates

### Layer 4: Routing Layer

这是当前项目最缺的一层。

建议 routing 单独输出 `RoutingResult`：

```js
{
  edges: {
    [edgeId]: {
      sourceAnchor,
      targetAnchor,
      points: [{ x, y }, ...],
      label: { x, y, w, h },
      kind: 'bezier' | 'smoothstep' | 'orthogonal',
    }
  }
}
```

这一层的职责：

- 决定 edge 从哪个 anchor 出发
- 决定 edge 从哪个 group boundary 进入
- 生成 bend points / corridor
- 调整 label 的最终位置

建议按 edge 类型分策略：

#### 1. Intra-group edge

- 可以继续偏简单
- TD 图优先 smooth-step / orthogonal-ish
- LR 图保留 bezier/smooth-step 混合

#### 2. Cross-group edge

Route B 的关键目标就是把这类边独立出来：

- 先从 source node 到 source group boundary
- 再从 source group boundary 走到 target group boundary
- 再进入 target node

也就是说，跨组边应该以 `group box` 为一级约束，而不是直接节点到节点。

#### 3. Feedback / backward edge

- 仍然保留外侧 lane 概念
- 但 lane 应在 routing 层统一管理
- 不再放在 edge renderer 层临时偏移

### Layer 5: Renderer / Interaction Layer

我的建议是：

**继续保留 XYFlow，但降低它的职责。**

应该保留 XYFlow 的：

- viewport / zoom / pan
- selection
- drag
- node interaction
- edge click / selection shell

应该逐步从 XYFlow 手里收回的：

- edge geometry 真相
- label placement 真相
- group box 几何真相

换句话说，XYFlow 应该消费：

- node rectangles
- group rectangles
- edge routed points / path kind
- label boxes

而不是自己推导这些几何。

## Recommended Module Boundaries

建议新增或重构成下面这些模块：

### `src/ir/`

- `toDiagramIR.js`
- `normalizeDiagramIR.js`
- `validateDiagramIR.js`

### `src/layout/`

- `buildLayoutGraph.js`
- `layoutGroups.js`
- `layoutLocalNodes.js`
- `assembleLayoutResult.js`

### `src/routing/`

- `buildRoutingGraph.js`
- `routeIntraGroupEdges.js`
- `routeCrossGroupEdges.js`
- `routeFeedbackEdges.js`
- `placeEdgeLabels.js`

### `src/view-model/`

- `toFlowNodesFromLayout.js`
- `toFlowEdgesFromRouting.js`

### Existing code that should shrink over time

- `src/model/layout.js`
  - 从“大一统布局器”降级成 facade / compatibility entry
- `src/model/applyGroupMargins.js`
  - 最终应该被真正的 group layout 取代
- `src/shared/readEdgeGeometry.js`
  - 最终不应承担主要 routing 语义，只保留 path serialization helper
- `src/webview-app/mapping/toFlowEdges.js`
  - 最终只做 view model mapping，不负责几何推导

## Migration Plan

最重要的不是终局图，而是迁移顺序。

建议分 4 个阶段，不要一次推翻：

### Phase 1: Introduce IR Without Behavior Change

目标：

- 把 parser 输出先转换成 `DiagramIR`
- 现有 layout/render 仍继续工作

交付：

- `toDiagramIR()`
- `DiagramIR` tests
- host/webview 继续传老字段，但内部开始依赖 IR

### Phase 2: Move Group Layout Into Dedicated Pipeline

目标：

- 用新的 group-first layout 取代 `applyGroupMargins()` 中的大部分策略
- 让 `LayoutResult.groups` 成为一等输出

交付：

- `layoutGroups()`
- `layoutLocalNodes()`
- 当前参考图达到更稳定的 Mermaid-like bands

### Phase 3: Introduce RoutingResult For Cross-Group Edges

目标：

- 不再在 renderer 临时算 edge path
- 跨组边通过 group boundary routing

交付：

- `RoutingResult`
- `toFlowEdgesFromRouting()`
- label final placement moved into routing layer

### Phase 4: Renderer Becomes Thin Consumer

目标：

- XYFlow 只消费我们生成的 geometry
- renderer 与 layout/routing 的耦合明显下降

交付：

- `NormalReadEdge` 只读 path/label geometry
- `toFlowEdges()` 不再生成主几何

## Risks

### 1. Over-design Risk

如果 IR 一开始设计太大，会拖慢落地。

控制办法：

- 先只覆盖 flowchart 当前子集
- 不一次把 class/link/theme/icon/img 全塞进来

### 2. Migration Risk

如果一开始就同时改 IR、layout、routing、renderer，容易失控。

控制办法：

- 每一阶段都保留兼容 facade
- 每一步都能单独回归

### 3. XYFlow Mismatch Risk

XYFlow 适合交互，不一定适合复杂 SVG 级 routing。

我的判断：

- 短中期仍然值得保留
- 但 path geometry 一定要内收
- 真到后期如果 XYFlow 成为瓶颈，再考虑 renderer 深化

## Recommendation

我的建议是：

### Go With Route B

但不是“继续修当前架构”，而是：

**正式把项目切到 `IR + Group Layout + Routing` 的混合架构升级路线。**

最优先的两件事：

1. 先定义 `DiagramIR`
2. 再把 `group-first layout` 从 patch 升级成正式 pipeline

在这两步之前，不建议继续大量投入纯 renderer 层修补。

## Final Judgment

如果项目愿意接受一轮中型架构升级，那么：

- 做到 `Mermaid-like high quality` 是有把握的
- 做到 `85-90 分` 的接近度是现实目标
- 当前最值得投资的，不是继续堆局部算法，而是把架构变成 Mermaid-like 的分层结构

这不是承诺“完全等同 Mermaid”。

这是一个更负责任的判断：

**Route B 值得做，而且具备工程可行性。**
