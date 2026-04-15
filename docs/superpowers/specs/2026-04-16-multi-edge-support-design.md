# Multi-Edge Support Design

## Goal

支持同一对节点之间存在多条边，并保证这些边在运行时具有稳定身份、可被单独选中/删除/重命名，同时在渲染层能清晰分离显示。

## Scope

本阶段支持：

- 同一 `(from, to)` 下多条 **不同 label** 的边
- 每条边拥有内部稳定 `id`
- 编辑操作按 `edgeId` 跟踪
- 并行边在渲染层分离显示

本阶段不承诺：

- 同一 `(from, to)` 下 `label` 也完全相同的重复边
- DSL 显式 edge id 语法
- 更高级的边路由优化

## Design Priorities

1. 先让多重边在模型和编辑链路里“真的成立”
2. 再让它在渲染层“真的看得见”
3. 不修改 `.flow` DSL 语法
4. 不破坏单边场景和既有工作流

## Non-Goals

- 不在本阶段支持完全重复边的稳定 round-trip
- 不引入 DSL 层显式 edge id
- 不做复杂全局路由或高级正交布线

## Existing Problem

当前实现里：

- parser 能保留多条 edge
- Dagre graph 允许 multigraph
- 但边身份主要依赖 `from/to/label/style`
- 删除/改 label/选中主要靠 `edgeRef`
- 渲染层对同 `(from, to)` 的多条边没有并行分离

所以现状是：

- “底层可存多条边”
- 但“不算真正支持多重边”

## Proposed Architecture

### Runtime Edge Model

将运行时 edge 结构扩展为：

```js
{
  id,
  from,
  to,
  label,
  style,
}
```

其中：

- `id` 是内部稳定 id
- 不写回 `.flow`
- 仅在运行时 graph / layout / renderer / selection / host-webview message 中使用

## Edge ID Strategy

第一版不改 parser 语法，在文档加载后的 normalize 步骤中生成 edge id。

建议形式：

```txt
edge_1
edge_2
edge_3
```

要求：

- 在一次文档加载内稳定
- 与 source 中 edge 出现顺序一致
- 可供 UI 和 host 作为主身份使用

## Serialization

`serializeDiagram()` 继续只序列化：

- `from`
- `to`
- `label`
- `style`

不写入：

- `id`

也就是说，多重边是 runtime identity 能力，不是 DSL 扩展。

## Editing Model

编辑链路从 `edgeRef` 切换为 `edgeId` 主导。

### New Rule

- 主身份：`edgeId`
- 辅助信息：`edgeRef`

示例消息：

```js
{ type: 'deleteEdge', edgeId: 'edge_3' }
{ type: 'renameEdgeLabel', edgeId: 'edge_3', label: 'clarify' }
```

### Affected Areas

- selected edge state
- delete edge action
- rename edge label action
- host message handlers
- reconcile selected edge after sync

兼容策略：

- 过渡期允许 host 接收旧的 `edgeRef`
- 但新主通道按 `edgeId`

## Renderer Model

### Stable Edge Identity

`toFlowEdges()` 输出的 XYFlow edge `id` 改为优先使用 runtime `edge.id`，不再依赖：

```txt
from->to#label
```

### Parallel Edge Separation

同 `(from, to)` 的边分组，按稳定顺序分配并行索引：

- 1 条：`0`
- 2 条：`-1, +1`
- 3 条：`-1, 0, +1`
- 4 条：`-1.5, -0.5, +0.5, +1.5`

渲染时只对 `parallelCount > 1` 的边做偏移。

### Offset Strategy

第一版不改节点锚点逻辑，只在曲线路径的控制形状上做法线方向偏移。

原因：

- 更少扰动现有 handle / decision clipping 逻辑
- 更容易把多重边支持限制在 edge renderer 内

## Phase 3 Compatibility

第三阶段的 `edgeLabels` 当前如果按 `from->to#label` 存，会和多重边冲突。

因此本设计要求：

- `edgeLabels` 改为按 `edgeId` 存

也就是：

```js
layout.edgeLabels = {
  [edgeId]: { x, y, w, h }
}
```

对应地：

- dummy label node mapping 也按 `edgeId`
- `toFlowEdges()` 根据 `edge.id` 读取 `labelLayout`

## File Boundaries

- Modify: `src/workspace/loadDiagramDocument.js`
  - 在 parser 输出后为 edge 注入内部稳定 id

- Modify: `src/model/serializeDiagram.js`
  - 保持忽略 `id`

- Modify: `src/model/createEdge.js`
  - 创建 edge 时生成内部稳定 id

- Modify: `src/model/createSuccessorNode.js`
  - 保证创建后继边也带 id

- Modify: `src/model/deleteEdge.js`
  - 增加按 `edgeId` 删除能力

- Modify: `src/model/renameEdgeLabel.js`
  - 增加按 `edgeId` 改 label 能力

- Modify: `src/model/edgeRef.js`
  - 降级为兼容层，不再做主身份逻辑

- Modify: `src/extension-helpers/resolveCustomFlowEditor.js`
  - host 消息处理改为优先按 `edgeId`

- Modify: `src/webview-app/App.jsx`
  - selected edge / rename / delete 消息改按 `edgeId`

- Modify: `src/webview-app/state/reconcileSelectedElement.js`
  - 按 `edgeId` 重新匹配

- Modify: `src/webview-app/mapping/toFlowEdges.js`
  - 使用 `edge.id`
  - 计算 parallel grouping
  - 挂载 `parallelIndex / parallelCount / labelLayout`

- Modify: `src/webview-app/components/edges/normalReadEdgePath.js`
  - 支持 parallel offset 参数

- Modify: `src/webview-app/components/edges/NormalReadEdge.jsx`
  - 把 parallel offset 传进路径函数

- Modify: `src/model/layout.js`
  - `edgeLabels` 改按 `edgeId`

- Modify: `src/model/buildLabelAugmentedGraph.js`
  - dummy label node mapping 改按 `edgeId`

## Rollout Plan

### Phase A: Identity First

先完成：

- edge 内部稳定 id
- 编辑链路按 `edgeId`
- phase 3 的 `edgeLabels` 改按 `edgeId`

目标：

- 单边场景完全不回归
- 边可以被稳定追踪

### Phase B: Parallel Edge Rendering

再完成：

- 同 `(from, to)` 边分组
- 并行索引
- 曲线路径 offset

目标：

- 多条边真正分开显示

### Phase C: Reference Diagram Regression

最后用真实图验证：

- 多条边能同时看见
- 每条边都能独立选中和编辑
- 普通图不受明显影响

## Test Strategy

### 1. Model Unit Tests

- edge id 注入稳定
- 新建 edge 时生成 id
- rename/delete 按 `edgeId` 生效

### 2. Mapping / Renderer Tests

- `toFlowEdges()` 输出稳定 edge id
- 同 `(from, to)` 的边有正确 `parallelIndex / parallelCount`
- `labelLayout` 通过 `edgeId` 绑定

### 3. Interaction Contract Tests

- selected edge 以 `edgeId` 为主
- delete / rename 消息以 `edgeId` 为主
- sync 后仍能重新匹配到正确的边

### 4. Reference Diagram Tests

- 多条 `control -> stageTwo` 之类边能同时显示
- 有 label 的并行边位置稳定
- 没有多重边的普通图仍保持当前效果

## Risks

1. 切到 `edgeId` 后，旧逻辑兼容遗漏
   - 先做 identity-only 阶段，锁死单边回归测试

2. 并行边 offset 过强，破坏普通图可读性
   - 只对 `parallelCount > 1` 生效
   - 默认 offset 保守

3. phase 3 的 `edgeLabels` key 改造牵连较大
   - 明确把它纳入多重边第一阶段，不分离拖延

## Recommendation

按本设计推进多重边：

1. 先补内部稳定 edge id
2. 再把编辑链路切到 `edgeId`
3. 再做 parallel edge rendering

这是在不改 DSL 的前提下，最稳妥的第一版真正多重边支持方案。
