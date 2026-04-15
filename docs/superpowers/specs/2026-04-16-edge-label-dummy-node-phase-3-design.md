# Edge Label Dummy Node Phase 3 Design

## Goal

让有 label 的边真正参与布局，减少标签压线、压节点和位置漂移问题，同时保持现有 `.flow` DSL、host/webview 同步协议、以及 XYFlow 节点/边交互模型不变。

## Scope

本阶段只处理：

- 有 label 的边
- 布局层内部的 dummy label node
- `layout.edgeLabels` 几何输出
- 渲染层优先消费 `edgeLabels`

本阶段不处理：

- 无 label 边的统一 dummy node 机制
- 更深的 edge routing 优化
- 更换布局引擎
- DSL 语法变化
- source graph / sync message 协议变化

## Design Priorities

1. 只解决“label 不参与布局”的核心问题
2. dummy node 只存在于布局层内部
3. 对现有 graph/source/sync 协议零泄漏
4. 无 label 边完全保持现状
5. 与第二阶段的 post-layout 规则兼容

## Non-Goals

- 不把 label 直接渲染成前端 node
- 不在本阶段追求复杂的 label 精确测量
- 不让 dummy label node 参与主路径排序

## Existing Problem

当前带 label 的边：

- 不参与 Dagre 布局
- label 位置主要靠边路径中点或轻量偏移
- 在边多、节点密集时，容易压线或压节点

Mermaid 的核心思路是：带 label 的边在布局阶段引入 dummy label node，使 label 本身成为布局约束的一部分。

## Proposed Architecture

保持对外的 `graph` 和 `layout` 契约不变，只扩展 `layout` 的形状：

当前：

```js
{
  nodes: {
    [nodeId]: { x, y, w, h }
  }
}
```

扩展后：

```js
{
  nodes: {
    [nodeId]: { x, y, w, h }
  },
  edgeLabels: {
    [edgeKey]: { x, y, w, h }
  }
}
```

其中：

- `nodes` 只包含真实节点
- `edgeLabels` 只包含有 label 的原始边

## Layout Pipeline

`autoLayoutGraph()` 的内部流程改为：

1. 输入原始 `graph`
2. 扫描有 label 的边
3. 构造扩展图
   - 为每条有 label 的边创建一个内部 dummy label node
   - 将原边拆成两段边
4. 对扩展图运行 Dagre
5. 从 Dagre 结果中提取：
   - 真实节点位置 -> `layout.nodes`
   - label node 位置 -> `layout.edgeLabels`
6. 将真实节点布局继续交给第二阶段的 post-layout
7. 保持 dummy label node 不进入真实节点集合

## Expanded Graph Rules

### Which Edges Expand

只处理：

- `edge.label` 为非空字符串的边

不处理：

- 无 label 边
- 仅有样式但无 label 的边

### Dummy Label Node ID

内部生成稳定 id，例如：

```txt
__edge_label__:<from>-><to>#<label>
```

只要求：

- 稳定
- 可逆
- 不与用户节点 id 冲突

## Edge Key

`edgeLabels` 使用稳定 key：

```txt
<from>-><to>#<label>
```

这和当前 `toFlowEdges()` 里生成 id 的方式保持一致，方便布局层与渲染层对齐。

## Dummy Label Node Dimensions

第一版使用稳定近似值，不做真实 DOM 测量。

建议规则：

- `w`: 按 label 文本长度估算，再加水平 padding
- `h`: 固定单行高度

尺寸估算应与当前 edge label 的视觉风格大致对齐，这样布局结果更接近最终渲染。

## Split-Edge Model

原始边：

```txt
A -> B "执行"
```

扩展为：

```txt
A -> __edge_label__
__edge_label__ -> B
```

拆分后的两段边：

- 保留方向
- 不再带 label
- 只服务布局，不暴露到外层渲染模型

## Internal Mapping

布局层内部维护一份映射：

```js
{
  [edgeKey]: {
    originalEdge,
    labelNodeId,
    firstSegmentKey,
    secondSegmentKey,
  }
}
```

作用：

- Dagre 结束后能从 label node 找回原始 edge
- 将 label node 几何转回 `layout.edgeLabels`

## Interaction With Phase 2

dummy label node 参与 Dagre 分层，但不参与第二阶段的主路径排序。

原则：

- Dagre 看得到 dummy label node
- `derivePrimaryFlow()` 只对真实节点打分
- `postLayoutRanks()` 只重排真实节点
- `applyGroupMargins()` 只作用于真实节点

这样可以避免 label node 污染第二阶段的主路径与 rank/order 规则。

## Output Contract

Dagre 结束后：

- 真实节点 -> 写入 `layout.nodes`
- dummy label node -> 写入 `layout.edgeLabels`

`edgeLabels` 存储左上角 box：

```js
{
  x,
  y,
  w,
  h,
}
```

这样渲染层既可以直接取中心点，也可以做后续微调。

## Renderer Integration

渲染层继续画“原始边”，不引入可见 label node。

### `toFlowEdges()`

为 edge 增加：

```js
data: {
  edgeRef,
  sourceNode,
  targetNode,
  labelLayout,
}
```

其中：

- `labelLayout` 来自 `layout.edgeLabels[edgeKey]`
- 无 label 边则没有该字段

### `NormalReadEdge.jsx`

渲染逻辑调整为：

1. 先计算边路径
2. 如果 `data.labelLayout` 存在：
   - 用它推导 `labelX/labelY`
3. 否则回退到现有中点逻辑

## Why Not Render Label Nodes Directly

如果直接把 label 当作前端 node 渲染，会污染现有语义：

- 选择态更复杂
- 删除/编辑边逻辑要额外绕一层
- host/webview 同步模型会变脏

本阶段的最佳策略是：

- 布局时把 label 当节点
- 渲染时把它还原成边标签

## File Boundaries

- Modify: `src/model/layout.js`
  - 构造扩展图
  - Dagre 使用扩展图
  - 输出 `layout.edgeLabels`

- Create: `src/model/buildLabelAugmentedGraph.js`
  - 根据原始 graph 构造扩展图和映射关系

- Create: `src/model/edgeLabelDimensions.js`
  - 估算 label dummy node 尺寸

- Modify: `src/model/derivePrimaryFlow.js`
  - 确保只对真实节点评分

- Modify: `src/model/postLayoutRanks.js`
  - 确保只重排真实节点

- Modify: `src/webview-app/mapping/toFlowEdges.js`
  - 将 `layout.edgeLabels` 带入 `edge.data`

- Modify: `src/webview-app/components/edges/NormalReadEdge.jsx`
  - 优先消费 `data.labelLayout`

- Modify: `src/webview-app/components/edges/normalReadEdgePath.js`
  - 保持现有路径生成，但支持 fallback label 逻辑

## Test Strategy

### 1. Expanded Graph Unit Tests

- 有 label 的边会被拆成两段
- 无 label 的边保持不变
- dummy label node id 和 edgeKey 稳定

### 2. Layout Output Unit Tests

- `layout.nodes` 只包含真实节点
- `layout.edgeLabels` 包含带 label 的边
- label box 尺寸和位置合理

### 3. Renderer Contract Tests

- `toFlowEdges()` 将 `labelLayout` 挂到 `edge.data`
- `NormalReadEdge.jsx` 优先消费 `labelLayout`
- 无 `labelLayout` 时继续使用原 fallback

### 4. Reference Diagram Tests

- 用真实参考图锁有 label 边的位置稳定性
- 确认有 label 边比当前版本更少压节点、压边

## Rollout Plan

第三阶段分两步：

1. 先完成布局层
   - 扩展图
   - dummy label node
   - `layout.edgeLabels`

2. 再完成渲染层接入
   - `toFlowEdges()` 携带 `labelLayout`
   - `NormalReadEdge.jsx` 优先消费 `labelLayout`

## Risks

1. edge key 不稳定，导致重渲染抖动
   - 复用当前稳定的 `from->to#label` 规则

2. dummy node 干扰第二阶段的 rank/order
   - 第二阶段排序只看真实节点

3. label 尺寸估算过大，导致图被撑坏
   - 第一版用保守近似值，并加真实图回归测试

## Recommendation

继续按本设计推进第三阶段：

- 只处理有 label 的边
- 布局时把 label 当节点
- 输出时把它还原成边标签几何

这是当前最接近 Mermaid 核心思路、又不破坏现有编辑架构的实现路线。
