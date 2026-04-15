# Mermaid-Like Post-Layout Phase 2 Design

## Goal

在不更换现有 `.flow -> graph -> Dagre -> XYFlow` 主链路的前提下，用一层 Mermaid-like post-layout 提升整体可读性，优先改善主路径清晰度、同层展开方式，以及 group 场景下的局部整洁度。

## Scope

本阶段只处理 **layout semantics**，不处理：

- edge label dummy node
- 更深的 cluster/edge routing 机制
- 更换布局后端
- host/webview 同步协议变更

## Design Priorities

1. 主路径更容易一眼看懂
2. 同层节点展开更接近 Mermaid 的阅读体验
3. 有无 group 时都提升可读性
4. 结果稳定、可预测，不因小改动产生剧烈抖动

## Non-Goals

- 不追求逐像素复刻 Mermaid
- 不让 group 主导整体层级
- 不在本阶段引入高成本全局优化或搜索算法

## Existing Pipeline

当前布局链路：

1. `parseDiagram()` 产出 `graph`
2. `autoLayoutGraph()` 用 Dagre 生成 `layout`
3. webview 把 `layout` 映射成 XYFlow nodes/edges

问题是当前 `autoLayoutGraph()` 基本等于“一次 Dagre 直接出结果”，缺少 Mermaid 那种基于层级和语义的后处理。

## Proposed Architecture

保留 Dagre 作为第一阶段分层器，在其后追加一层 post-layout：

1. `autoLayoutGraph(graph, options)`
   - 先运行 Dagre
   - 再运行新的 post-layout 流程
   - 返回修正后的最终 `layout`

2. `postLayoutRanks(graph, layout, spacing)`
   - 按主轴把节点分 rank
   - 对每个 rank 内节点重排
   - 重新分配 cross-axis 坐标

3. `derivePrimaryFlow(graph)`
   - 计算轻量主路径优先级
   - 为同层排序提供稳定依据

4. `applyGroupMargins(graph, layout)`
   - 做 group 的弱参与修正
   - 只改善局部视觉分区，不改主层级

## Rank Model

`LR` 图：

- Dagre 决定 `x` 层级
- post-layout 只重排 `y`

`TD/TB` 图：

- Dagre 决定 `y` 层级
- post-layout 只重排 `x`

rank 分组使用主轴容差，而不是要求完全相等。这样可以兼容 Dagre 输出中的轻微浮动。

## Sorting Rules

每个 rank 内按以下优先级排序：

1. 主路径优先
2. 文本声明顺序兜底
3. 局部冲突修正

### 1. 主路径优先

第一版不引入复杂图算法，只计算轻量分数：

- 来自主干前向节点的连接，加分
- 前向出边较多，加分
- 明显回边目标，减分

这不是“求唯一主链”，而是为 rank 内排序提供一个可解释、稳定的偏置。

### 2. 文本顺序兜底

当两个节点主路径分数接近时，按 `.flow` 声明顺序排序。这样结果更稳定，也更符合作者写 DSL 的心智模型。

### 3. 局部冲突修正

如果重排后明显增加超长跨线或糟糕交叉，允许只在 rank 内做非常克制的局部交换。

约束：

- 不做全局搜索
- 不跨 rank 移动节点
- 不推翻主路径优先的总体趋势

## Group Participation

group 在本阶段采用 **弱参与**：

- 不参与 Dagre 主分层
- 不主导 rank 决策
- 在 rank 内排序完成后再做局部修正

允许的修正：

- 同组节点尽量保持相邻
- 组标题上方留白更稳定
- 组框更自然包裹内部节点

不允许的修正：

- 为了组完整而打乱主链顺序
- 为了组外观而明显拉高或拉宽整体图

## File Boundaries

- Modify: `src/model/layout.js`
  - 在 Dagre 结果后接入 post-layout
  - 暴露 spacing 和后处理入口

- Create: `src/model/postLayoutRanks.js`
  - rank 分组、排序、cross-axis 再分配

- Create: `src/model/derivePrimaryFlow.js`
  - 计算轻量主路径优先级

- Create: `src/model/applyGroupMargins.js`
  - group 的弱参与局部修正

- Modify: `test/layout.test.js`
  - 新增更贴近 Mermaid 阅读目标的行为断言

- Create: `test/post-layout-ranks.test.js`
  - 锁 rank 分组与方向相关行为

- Create: `test/derive-primary-flow.test.js`
  - 锁主路径优先级的轻量规则

## Test Strategy

### Unit Tests

- rank 分组容差
- `LR` 与 `TD` 的 cross-axis 重排
- 文本顺序兜底
- 主路径优先级的稳定性

### Contract Tests

- `autoLayoutGraph()` 仍以 Dagre 为第一阶段
- post-layout 只在 rank 内调整，不跨 rank 改层级

### Reference Diagram Tests

使用 `例图与对比/` 中的真实样例，锁以下结果：

- 主路径节点的读取顺序更稳定
- 同层节点展开优于当前实现
- 有 group 时没有破坏主流程阅读顺序

## Rollout Plan

Phase 2 分两步实施：

1. 先做 `rank/order post-layout`
   - rank 分组
   - 主路径优先
   - 文本顺序兜底

2. 再加 `group` 的弱参与修正
   - 同组聚拢
   - 标题留白
   - 局部包裹优化

只有这两步稳定后，才进入下一阶段的 `edge label dummy node` 设计。

## Risks

1. 排序规则过强，导致作者预期被破坏
   - 用文本顺序兜底控制稳定性

2. group 修正过强，重新制造“为框服务”的布局
   - 明确 group 只能弱参与

3. 真实图收益不明显，只有玩具图通过
   - 引入参考图测试，不只看小图单测

## Recommendation

继续按本设计推进第二阶段：

- 保留现有 Dagre 和 XYFlow
- 不换布局引擎
- 先补 Mermaid-like post-layout semantics

这是当前成本、风险、收益最平衡的路线。
