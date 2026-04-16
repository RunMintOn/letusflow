# Route C ELK Rebuild Design

Date: 2026-04-16
Branch: `route-c-elk-rebuild`

## Goal

把当前 `.flow -> graph -> dagre -> post-layout patch -> XYFlow` 的渲染链路，升级为一条以 `DiagramIR + ELK + 独立 routing/view model` 为核心的新主链，使项目从“局部修形”转向“结构性接近 Mermaid”。

本次重构的成功标准不是一次性追平 Mermaid 所有视觉细节，而是先稳定拿下 4 个基础能力：

1. `group/subgraph` 成为一等布局实体
2. `label` 进入布局与路由输入，而不是只靠事后修补
3. 跨组边有稳定的几何来源，不再主要依赖 renderer 即时生成
4. XYFlow 降级为交互壳，不再充当几何真相来源

## Current Problems

当前主链已经通过 patch 获得了一些 Mermaid-like 改善，但瓶颈已经不是单个算法参数，而是架构边界本身：

- `graph` 同时混合语义、布局输入和部分渲染约束
- `group` 目前仍更像“布局后推导出的视觉框”，而不是一等布局对象
- `edge path` 仍主要在 renderer 侧即时生成
- `edge label` 的稳定性依赖 dummy node 和后处理 realign
- renderer 侧 path helper 的能力边界，会反向限制上游布局表达

这些问题使当前路线更像“持续补丁系统”，而不是可扩展的 Mermaid-like 引擎。

## Chosen Direction

本次采用 `Route C` 作为主线，且按“并行迁移”执行，而不是直接替换旧主链。

目标链路：

`.flow -> DiagramIR -> ELK graph -> ELK layout result -> routing result -> view model -> XYFlow`

执行原则：

- 保留现有链路一段时间作为 fallback
- 新链路先在代表性复杂图上跑通
- 只有当复杂图达到可接受效果后，才切换主渲染入口

这样做的原因是降低迁移风险，同时让我们能快速验证 ELK 是否真的解决核心问题，而不是在主链上盲改。

## Architecture

### 1. Source Layer

职责：

- 解析 `.flow`
- 序列化 `.flow`
- 保持文本编辑与结构编辑 round-trip

这一层不承载布局几何，不写入 renderer-specific 字段。

### 2. Semantic IR Layer

新增稳定中间层 `DiagramIR`，作为语义真相来源。

建议的最小结构：

```js
{
  direction: 'TD' | 'LR',
  nodes: [
    {
      id: 'router',
      label: '意图分析器',
      type: 'decision',
      groupId: 'stage_1',
      style: { color: null },
    },
  ],
  edges: [
    {
      id: 'router->task_entry',
      from: 'router',
      to: 'task_entry',
      label: '复杂任务/读写文件',
      style: { pattern: 'solid' },
      semantic: {
        isCrossGroup: true,
      },
    },
  ],
  groups: [
    {
      id: 'stage_1',
      label: 'Stage 1: 意图分析器',
      parentGroupId: null,
      childNodeIds: ['router', 'clarify', 'reply'],
    },
  ],
}
```

约束：

- `DiagramIR` 不包含 `x/y/w/h/path`
- 不包含 XYFlow `position/sourcePosition/targetPosition`
- 不包含 SVG path

### 3. ELK Layout Layer

新增 ELK 输入映射层，把 `DiagramIR` 转成 compound-aware ELK graph。

这一层至少需要让以下实体进入同一套布局系统：

- nodes
- groups / clusters
- edge labels
- ports or port-like anchors

第一阶段先使用 ELK layered，重点拿到：

- 稳定的层级布局
- compound/group 参与布局
- label 参与布局
- 跨组边的基础几何信息

### 4. Routing Layer

布局结果出来后，不直接由 renderer 自由生成 path，而是统一生成 `RoutingResult`。

建议最小结构：

```js
{
  edgeId: 'router->task_entry',
  sections: [
    {
      startPoint: { x: 400, y: 260 },
      bendPoints: [{ x: 400, y: 360 }, { x: 680, y: 360 }],
      endPoint: { x: 680, y: 460 },
    },
  ],
  labelBox: {
    x: 500,
    y: 330,
    w: 92,
    h: 24,
  },
}
```

这一层的目标不是一开始就做最复杂的自定义 router，而是先把“边的主要几何”从 renderer 里拿出来。

### 5. View Model / Renderer Layer

XYFlow 保留，但职责收缩：

- 承载交互
- 承载节点选择、拖拽、缩放、视口状态
- 消费我们产出的节点盒子、group 盒子、edge sections、label boxes

XYFlow 不再是路径语义来源，只是消费 geometry 的渲染容器。

## Migration Strategy

采用 4 阶段并行迁移：

### Phase 0: 建立旁路骨架

- 新增 `DiagramIR`
- 新增 IR builder
- 新增 ELK adapter
- 新增 `LayoutResult` / `RoutingResult` 数据结构
- 不切主链

输出是：给定 `.flow`，可以同时跑旧链和新链。

### Phase 1: 跑通最小 ELK 链路

- 选定代表性复杂图：`例图与对比/accorda-full-overview.flow`
- 用 ELK 跑出 nodes/groups/labels 的基础布局
- 把结果映射到临时 view model
- 在 webview 中增加一个隐藏或切换式的新渲染入口

输出是：复杂图能在新链路下被稳定渲染，即使视觉还不完美。

### Phase 2: 接管跨组边和标签几何

- 把 edge sections 和 label boxes 从 renderer 中剥离
- 让 renderer 消费 `RoutingResult`
- 逐步废弃 `dummy label node + final realign` 这类补丁逻辑

输出是：边和标签的主要几何来自新链路，而不是 renderer 推断。

### Phase 3: 切主链并清理旧 patch

- 在新链路满足目标样例的前提下，切换默认布局入口
- 删除 dagre-only post-layout patch 中已被新链路替代的部分
- 保留少量视觉 polish，但不再让 patch 充当架构支柱

输出是：新主链默认工作，旧链成为 fallback 或被移除。

## File and Module Direction

建议新增或演化的模块如下：

- `src/model/diagramIr/`
  - `buildDiagramIr.js`
  - `normalizeDiagramIr.js`
- `src/model/layout/`
  - `buildElkGraph.js`
  - `runElkLayout.js`
  - `extractLayoutResult.js`
- `src/model/routing/`
  - `buildRoutingResult.js`
  - `normalizeEdgeSections.js`
- `src/model/view-model/`
  - `toFlowViewModel.js`
- `src/webview-app/mapping/`
  - 从“直接依赖旧 layout 结构”转为“消费 view model”

已有文件的预期变化：

- `src/model/layout.js`
  - 逐步从“全能布局入口”收缩成旧链兼容层或 facade
- `src/webview-app/components/edges/normalReadEdgePath.js`
  - 从“生成主要路径”转为“消费已算好的 edge sections”
- `src/webview-app/mapping/toFlowNodes.js`
  - 从旧 graph/layout 结构映射迁移到新 view model
- `src/webview-app/mapping/toFlowEdges.js`
  - 改为消费 routing result 和 label boxes

## Non-Goals

以下内容不作为第一阶段目标：

- 一开始就完全复制 Mermaid 所有视觉细节
- 一开始就替换掉所有 XYFlow 组件
- 一开始就支持所有可能的边样式和特殊节点
- 一开始就处理任意规模图的极限性能优化

第一阶段更重要的是架构方向正确、复杂图能稳定跑通。

## Risks and Controls

### Risk 1: 直接接入 ELK 但旧结构不拆，收益吃不满

控制方式：

- 先建 `DiagramIR`
- 先把布局和路由结果结构化
- 不允许 renderer 继续充当几何真相来源

### Risk 2: 重构跨度太大，主链长期不可用

控制方式：

- 并行迁移
- 保留旧链 fallback
- 只在代表性复杂图通过后切主

### Risk 3: ELK 实际效果不如预期

控制方式：

- 第一阶段就用复杂样例做 spike
- 把成败标准放在 `group / cross-group edge / label stability`
- 若部分 routing 不理想，允许在 ELK layout 之后追加轻量 routing polish，但不回退到旧 patch 架构

## Testing Strategy

测试分 4 层：

1. Parser / IR tests
   - `.flow -> DiagramIR` 是否稳定
2. ELK adapter tests
   - `DiagramIR -> ELK graph` 是否正确表达 group/label/ports
3. Layout / routing contract tests
   - 关键复杂图是否满足可读性指标
4. Webview mapping tests
   - renderer 是否消费新 view model，而不是偷算几何

关键验收样例：

- `例图与对比/accorda-full-overview.flow`
- `agent-loop.flow`
- 至少一张以 group/subgraph 为主的图

## Initial Success Metrics

第一阶段达到以下条件即可视为重构方向成立：

- 复杂图在 TD 方向下整体结构明显更接近 Mermaid
- group 盒子不再只是“套住节点”，而是参与布局形成稳定层级
- 跨组边减少大斜线和随意穿越感
- edge label 位置来自布局/路由结果，而不是后修正漂移
- webview 渲染层不再主导主要 path 语义

## Recommendation

建议立即把路线C作为唯一长期主线，停止继续扩展旧 patch 链路。

短期内允许为旧链做最少量维护，但不再追加新的 Mermaid-like 主能力。所有新的结构性工作都应进入 `DiagramIR + ELK + RoutingResult` 这条新主线。
