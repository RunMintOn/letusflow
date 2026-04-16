# Route C ELK PoC Design

## Goal

为项目建立一条最小可运行的 Route C / ELK 骨架：

- 定义一份纯语义、无坐标的 `DiagramIR`
- 建立 `graph -> DiagramIR -> ELK JSON -> layout/routing result` 的最小链路
- 明确边几何由布局/路由层产生，renderer 只消费结果
- 跑通一个最小 PoC，证明项目可以脱离“renderer 即几何真相”的旧边界

这不是一次完整的 ELK 替换，而是一次架构切口验证。

## Scope

本阶段只做：

- `DiagramIR` 协议
- 从现有 `graph` 适配到 `DiagramIR`
- 最小 `toElkJson()` 转换
- 从 ELK 结果提取节点/分组坐标与边路径
- `RoutingResult` 协议
- 一个最小 renderer 消费链路
- 一个最小 PoC 场景：`1 group + 2 nodes + 1 edge`

本阶段不做：

- 全量替换现有 Dagre 布局链路
- 重写 parser / serializer / 编辑消息协议
- 支持复杂嵌套 group
- 支持完整的 label placement
- 支持现有所有 edge style / decision clipping / 多重边视觉细节
- 在生产主链路里默认启用 ELK

## Design Priorities

1. 先把架构边界立住，再谈效果优化
2. `DiagramIR` 成为新真相，旧 `graph` 只做兼容输入
3. `RoutingResult` 明确成为边路径唯一来源
4. PoC 范围足够小，能快速验证而不打散现有 Dagre 主线

## Non-Goals

- 不追求第一版视觉上超越当前 Dagre 结果
- 不要求 ELK 一上来接管所有参考图
- 不在本阶段清除所有旧几何 helper
- 不把旧 `graph` 立刻删除

## Existing Problem

当前仓库已经开始往 Mermaid-like 方向推进，但几何边界仍然混杂：

1. parser 与编辑链路输出的是当前 `graph`
2. `layout` 主要负责节点盒子和部分 label 盒子
3. edge path 仍主要由 renderer 内的 helper 即时计算
4. `NormalReadEdge.jsx` 和 `readEdgeGeometry.js` 仍然控制“边应该怎么走”

这会导致两个问题：

- 即使接入 ELK，renderer 仍可能绕开布局结果，继续“自作聪明”
- `group`、`edge path`、`label` 无法成为统一布局/路由模型的一部分

所以 Route C 的第一步不是追求更聪明的算法，而是收回几何所有权。

## Decision

### 1. 新真相是 `DiagramIR`

本阶段开始，不再给旧 `graph` 添加新的布局语义。

但为了控制风险，不直接废除旧 `graph`。策略是：

- parser、serialize、编辑链路继续围绕旧 `graph`
- 进入 Route C / ELK 流程前，先做一次 `graph -> DiagramIR`
- 后续所有新增布局/路由语义，只进入 `DiagramIR` 及其下游结果，不回灌到旧 `graph`

这意味着：旧 `graph` 被“冻结”为兼容层，而不是继续演进的核心模型。

### 2. 边几何所有权属于 `RoutingResult`

PoC 路径中：

- 布局/路由层必须产出 edge path 几何
- renderer 只允许消费这些几何
- renderer 不再根据节点盒子推导曲线、折点、平行偏移或 handle 方向

过渡期允许项目保留现有 `readEdgeGeometry` 等 helper，但它们只能服务旧链路，不能成为 Route C PoC 的真相来源。

### 3. ELK 先做“最小可信链路”，不做“大一统接管”

第一版不是要把整个编辑器切到 ELK，而是要证明以下闭环成立：

`graph`
-> `DiagramIR`
-> `ELK input`
-> `ELK output`
-> `LayoutResult + RoutingResult`
-> renderer

只要这一条链在一个最小场景里稳定成立，Route C 就有继续展开的基础。

## Proposed Architecture

推荐拆成 4 个新边界：

1. `DiagramIR`
2. `ELK adapter`
3. `LayoutResult / RoutingResult`
4. `renderer consumer`

链路如下：

```txt
parseDiagram()
-> graph
-> toDiagramIR(graph)
-> toElkJson(ir)
-> runElkLayout(elkJson)
-> fromElkLayout(elkResult)
-> { layoutResult, routingResult }
-> webview view model
-> renderer
```

当前 Dagre 链路保持不动，PoC 链路以并行入口存在。

## DiagramIR Contract

`DiagramIR` 必须是纯语义模型，不包含任何几何字段：

```js
{
  direction: 'LR' | 'TD' | 'TB',
  groups: [
    {
      id,
      label,
      parentGroupId: null,
    },
  ],
  nodes: [
    {
      id,
      label,
      type: 'default' | 'decision' | 'start' | 'end' | 'input',
      groupId: string | null,
      style: {
        color: string | null,
      },
    },
  ],
  edges: [
    {
      id,
      from,
      to,
      label: string | null,
      style: {
        pattern: 'solid' | 'dashed' | 'dotted' | 'dashdot',
      },
    },
  ],
}
```

约束：

- 不包含 `x/y/w/h`
- 不包含 SVG path
- 不包含 XYFlow `sourcePosition` / `targetPosition`
- 不包含渲染专用节点类型

### Adapter Rule

第一版新增：

```js
toDiagramIR(graph)
```

职责：

- 把现有 `graph` 正规化为 `DiagramIR`
- 补齐默认 node type / edge style
- 保留运行时 `edge.id`

不负责：

- 任何坐标计算
- 任何路由推导

## ELK Adapter Contract

第一版新增：

```js
toElkJson(diagramIR)
```

目标不是暴露 ELK 的所有能力，而是建立最小稳定映射。

第一版只支持：

- 图方向
- 顶层 group
- 普通 node
- 普通 edge

建议输出形状：

```js
{
  id: 'root',
  layoutOptions: {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
  },
  children: [
    {
      id: 'group:stage',
      labels: [{ text: 'Stage' }],
      children: [
        {
          id: 'task',
          width: 140,
          height: 56,
          labels: [{ text: 'Task' }],
        },
      ],
    },
  ],
  edges: [
    {
      id: 'edge_1',
      sources: ['task'],
      targets: ['done'],
      labels: [{ text: 'next' }],
    },
  ],
}
```

### Key Rule

`toElkJson()` 是唯一允许理解 ELK JSON 细节的层。

其上游只认识 `DiagramIR`，其下游只认识 ELK 输入/输出。

这样后续即使改 ELK 选项或替换 layout backend，也不会污染 parser、IR、renderer。

## LayoutResult Contract

PoC 仍然需要节点和 group 盒子，因此定义一个独立布局结果：

```js
{
  groups: {
    [groupId]: { x, y, w, h },
  },
  nodes: {
    [nodeId]: { x, y, w, h },
  },
}
```

约束：

- 只存盒子几何
- 不存 edge path
- 不混入 renderer-specific 字段

## RoutingResult Contract

Route C 的核心是让 `RoutingResult` 成为边几何唯一来源。

第一版定义：

```js
{
  edges: {
    [edgeId]: {
      points: [
        { x, y },
        { x, y },
      ],
      label: null,
    },
  },
}
```

说明：

- `points` 是边路径主折点序列
- 第一版允许点数量最少，只要能表达从 ELK 结果提取出的路径
- `label` 可先为 `null`
- 不要求第一版直接存 SVG path 字符串

renderer 层可以把 `points` 序列序列化成 path，但不能再自行推导路由拓扑。

### Renderer Rule

PoC 路径中的 edge renderer 只能做：

- 读取 `routingResult.edges[edgeId].points`
- 把点序列序列化为 SVG path
- 应用视觉样式

PoC 路径中的 edge renderer 不能做：

- 根据节点坐标决定 edge 怎么走
- 决定是否画贝塞尔或 smooth-step
- 决定平行偏移
- 决定 label 中点位置

## PoC Slice

PoC 最小场景固定为：

- `1 group`
- `2 nodes`
- `1 edge`

例如：

```flow
dir LR
group stage "Stage"
node task "Task" in stage
node done "Done" in stage
edge task -> done
```

PoC 验收条件：

1. 从 `.flow` 可以得到旧 `graph`
2. 能从旧 `graph` 生成 `DiagramIR`
3. 能从 `DiagramIR` 生成最小 `toElkJson()` 输出
4. 能从 ELK 结果提取 group/node 盒子
5. 能从 ELK 结果提取 edge 点序列
6. renderer 消费的是 `RoutingResult`，不是旧 edge geometry helper
7. 渲染出的 edge 与 group/node 位置都由 ELK 结果驱动

第 5 和第 6 条是这次 PoC 的硬门槛。只有盒子坐标，不算 Route C 成功。

## Integration Strategy

为了避免打散当前主链路，PoC 按并行入口集成：

1. 保留现有：
   - `loadDiagramDocument()`
   - `autoLayoutGraph()`
   - `toFlowNodes()`
   - `toFlowEdges()`
   - `NormalReadEdge` 旧逻辑

2. 新增 Route C PoC 入口：
   - `toDiagramIR(graph)`
   - `toElkJson(ir)`
   - `fromElkLayout(elkResult)`
   - `toPocFlowNodes(layoutResult)`
   - `toPocFlowEdges(routingResult)`

3. PoC 视图或测试链路只走新入口

这样做的目的：

- 降低对当前 Dagre 主线的扰动
- 允许旧链路继续开发
- 给 Route C 留出清晰实验面

## File Boundaries

- Create: `src/ir/toDiagramIR.js`
  - `graph -> DiagramIR`

- Create: `src/layout/elk/toElkJson.js`
  - `DiagramIR -> ELK JSON`

- Create: `src/layout/elk/fromElkLayout.js`
  - `ELK output -> { layoutResult, routingResult }`

- Create: `src/routing/serializeEdgePoints.js`
  - 将 `RoutingResult.points` 序列化为 SVG path

- Create: `src/webview-app/mapping/toPocFlowNodes.js`
  - 从 `layoutResult.nodes/groups` 生成最小 XYFlow nodes

- Create: `src/webview-app/mapping/toPocFlowEdges.js`
  - 从 `routingResult` 生成最小 XYFlow edges

- Create: `src/webview-app/components/edges/PocRouteEdge.jsx`
  - 只消费 `points`，不做几何决策

- Add tests:
  - `test/to-diagram-ir.test.js`
  - `test/to-elk-json.test.js`
  - `test/from-elk-layout.test.js`
  - `test/poc-route-edge.test.js`
  - `test/route-c-poc-contract.test.js`

## Testing Strategy

### Unit Tests

- `toDiagramIR()` 正确正规化默认 type/style
- `toElkJson()` 正确表达 direction、group、node、edge
- `fromElkLayout()` 正确提取 node/group box 和 edge points
- `serializeEdgePoints()` 对点序列生成稳定 path

### Contract Tests

- `RoutingResult` 中每条边都必须有 `points`
- `PocRouteEdge.jsx` 不依赖 `sourceX/sourceY/targetX/targetY` 推导路径
- PoC edge renderer 不引用 `readEdgeGeometry.js`

### PoC Scenario Test

用固定最小图锁以下结果：

- group/node 坐标来自 ELK 结果
- edge path 来自 ELK 结果
- 切换 renderer 不改变几何真相来源

## Rollout

Phase A: 定义协议

- `DiagramIR`
- `LayoutResult`
- `RoutingResult`

Phase B: 跑通 ELK 适配

- `toElkJson()`
- `fromElkLayout()`
- 最小测试 fixture

Phase C: 跑通 PoC renderer

- `PocRouteEdge`
- `toPocFlowNodes()`
- `toPocFlowEdges()`

Phase D: 决定是否扩大覆盖面

只有 PoC 证明“renderer 不再生产 edge geometry”之后，才继续考虑：

- 多 group
- label
- edge style
- 与正式 webview 链路合流

## Risks

1. 过早全量接管主链路，导致当前 Dagre 工作被打断
   - 用并行 PoC 入口隔离风险

2. `DiagramIR` 设计不纯，重新混入坐标或 XYFlow 字段
   - 明确禁止几何和 renderer 字段进入 IR

3. 名义上有 `RoutingResult`，实际上 renderer 仍在偷算路径
   - 用 contract test 锁死 renderer 输入边界

4. ELK 输出结构被上层直接依赖，造成强耦合
   - 只允许 `toElkJson()` / `fromElkLayout()` 知道 ELK 细节

## Recommendation

按本设计推进。

正确的第一刀不是“把所有布局都切到 ELK”，而是：

- 先把 `DiagramIR` 立起来
- 先把 `RoutingResult` 立起来
- 先让 renderer 在一条 PoC 链路里失去几何决策权

只要这件事做成，Route C 就从“想法”变成了真实可扩展的架构起点。
