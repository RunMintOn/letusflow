# Mermaid 渲染链路调研

## 项目信息

- **仓库**: `github.com/mermaid-js/mermaid`
- 可使用 `deepwiki mcp` 来帮助获取相关信息
- **开源**: 是（MIT License）
- **代码量**: 几万行，高度模块化

---

## 从文本到 SVG 的 7 步流程

```
第1步：文本
  graph TD
    A --> B

第2步：Jison Parser → AST
  flow.jison（文法规则）→ flowParser.ts
  输出：{ type: 'flowchart', statements: [...] }

第3步：FlowDB（中间数据库）
  把 AST 打平，存入内存数据库
  - 顶点表（vertices）
  - 边表（edges）
  - 子图表（subgraphs）
  - 样式表（classes/styles）

第4步：LayoutData 标准化
  从 FlowDB 提取成统一格式，供布局引擎消费

第5步：布局引擎（Dagre 或 ELK）
  关键！Mermaid 不是裸调 Dagre，而是包了一层：
  - recursiveRender() / dagreLayout()
  - 支持嵌套子图
  - 支持子图之间的连线

第6步：SVG 渲染（D3.js）
  - 画节点形状（圆角矩形、菱形、圆形等）
  - 画连线（带曲线插值、端点裁剪）
  - 画子图背景框

第7步：后处理
  - 标题插入
  - 视口自适应缩放
  - 链接可点击化
  - XSS 消毒（DOMPurify）
```

---

## Mermaid 比我们多了什么（当前差距）

> 当前项目已经补上了部分基础视觉语义：Dagre 参数、Group 背景框、`type=decision` 决策菱形、feedback edge 外侧回环路由。下面按当前代码状态重新对齐，不再沿用最早的“完全没有”判断。

### 1. Parser 层：我们少了一整层中间数据库

| 我们 | Mermaid |
|------|---------|
| parseDiagram → 直接出轻量 graph | Parser → **FlowDB** → LayoutData |

FlowDB 是 Mermaid 的核心资产。它不只是存节点和边，还存：
- 子图的父子关系
- 节点样式（菱形决策、圆角矩形等）
- CSS class 引用
- 链接（点击跳转）

**当前状态：部分补强，但还不是 FlowDB。**

- 已支持 `group`、`node ... in <group>`、`edge ... dashed`。
- 已支持 `node ... type=decision`，并在序列化、布局、webview 映射中保留节点类型。
- 还没有 class/style/link、嵌套 group、group-to-group edge，也没有统一 LayoutData 层。

### 2. 布局层：Mermaid 包了 Dagre，不是裸调

**关键源码文件**: `packages/mermaid/src/rendering-util/layout-algorithms/dagre/index.js`

Mermaid 对 Dagre 做的封装：

| 功能 | Mermaid | 我们 |
|------|:-------:|:---:|
| 嵌套子图布局 | ✓ recursiveRender 递归布局 | ✗ 不支持 |
| 边交叉优化 | ✓ 后处理调整 | ✗ 没有 |
| 曲线插值类型 | 7种（linear/basis/cardinal/catmullRom/...） | 主流程 straight，回环 feedbackEdge |
| 节点边界裁剪 | ✓ 线不会穿进节点里面 | ✓ XYFlow 自己处理 |
| 权重配置 | ✓ flowchart.ranksep / nodesep 可调 | 已调 ranksep/nodesep/margin，但无主路径权重 |

**当前状态：布局参数已调，复杂布局封装未做。**

- `src/model/layout.js` 已设置 `ranksep`、`nodesep`、`margin`。
- `decision` 节点使用更高的布局 footprint，避免菱形过挤。
- feedback edge 不再穿过主图，而是根据 layout bounds 计算外侧 lane。
- 还没有递归 cluster layout、主路径加权、全局交叉优化。

### 3. 连线渲染：Mermaid 是"精装修"

**关键源码文件**: `packages/mermaid/src/rendering-util/rendering-elements/edges.js`

| 维度 | Mermaid | 我们（XYFlow） |
|------|---------|---------------|
| 线型 | 可配置（直线/曲线/阶梯） | straight、dashed、feedbackEdge |
| 标签避让 | 标签不压线 | 标签可能重叠 |
| 端点裁剪 | 线到节点边界就停 | ✓ XYFlow 也做了 |
| 箭头 | 可配置样式 | 已设置轻量箭头样式 |
| 交叉优化 | Dagre 返回后还会做二次调整 | 仅回环边外侧路由，未做通用交叉优化 |

**当前状态：读图体验已有改善，但标签和交叉仍是短板。**

- 主流程边默认 `straight`，降低装饰感。
- 支持 `dashed` 虚线边。
- feedback edge 使用自定义 edge 组件和 path helper，按图边界分配外侧 lane；多条回环边会继续向外错开。
- 还没有边标签避让、标签自动换边、通用 edge router。

### 4. 子图：Mermaid 有专门的 Cluster 渲染

**关键源码文件**: `packages/mermaid/src/rendering-util/rendering-elements/clusters.js`

Mermaid 把子图当成特殊的节点，有自己的背景框、标题、内边距。

**当前状态：已有基础 Group 视觉，但不是 Mermaid cluster layout。**

- `group` DSL 已经映射成 `groupNode`。
- `toFlowNodes.js` 会根据组内子节点 layout 计算背景框位置和尺寸。
- `GroupNode.jsx` 和 CSS 已渲染背景框与标题。
- 还没有嵌套 group、group 参与 Dagre 排版、跨 group 连线优化。

---

## 当前可读性问题

现在的问题不再是“完全没有 Mermaid 语义”，而是：

1. **布局仍然缺少全局语义**
   - Dagre 参数已调，但没有主路径权重。
   - Group 只是按子节点画框，不参与布局求解。
   - 复杂图仍可能出现交叉、过长边、局部密度不稳定。

2. **连线还有局部算法，不是通用 edge router**
   - feedback edge 已走外侧 lane。
   - 普通边仍主要依赖 XYFlow 的基础线型。
   - 标签避让还没做。

3. **图模型仍然轻量**
   - `type=decision` 是第一步，但还没有 node shape/style/link/class 体系。
   - 如果继续加 Mermaid 级别能力，需要考虑 FlowDB/LayoutData 类中间层。

---

## 当前差距优先级与解决成本

| 差距 | 当前状态 | 解决成本 | 建议顺序 |
|------|----------|:-------:|:-------:|
| 调 Dagre 参数（ranksep/nodesep） | 已完成基础版 | 低 | 已做 |
| 加子图渲染（Group 节点） | 已完成基础版 | 中 | 已做 |
| 决策节点语义（菱形） | 已完成基础版 | 低 | 已做 |
| 回环边外侧路由 | 已完成基础算法版 | 中 | 已做 |
| 连线标签避让 | 未实现 | 中 | 下一步 |
| 主路径权重 / 方向语义 | 未实现 | 中 | 下一步 |
| 通用线交叉优化 | 未实现 | 高 | 暂缓 |
| FlowDB / LayoutData 中间层 | 未实现 | 高 | 等需求扩大后再做 |
| 嵌套 cluster layout | 未实现 | 高 | 暂缓 |

---

## 关键源码文件索引

| 功能 | Mermaid 文件路径 |
|------|-----------------|
| Parser 入口 | `packages/mermaid/src/diagrams/flowchart/parser/flowParser.ts` |
| Jison 文法 | `packages/mermaid/src/diagrams/flowchart/parser/flow.jison` |
| 中间数据库 | `packages/mermaid/src/diagrams/flowchart/flowDb.ts` |
| 渲染入口 | `packages/mermaid/src/diagrams/flowchart/flowRenderer-v3-unified.ts` |
| Dagre 封装 | `packages/mermaid/src/rendering-util/layout-algorithms/dagre/index.js` |
| 连线渲染 | `packages/mermaid/src/rendering-util/rendering-elements/edges.js` |
| 子图渲染 | `packages/mermaid/src/rendering-util/rendering-elements/clusters.js` |
| 检测器 | `packages/mermaid/src/diagrams/flowchart/detectors.ts` |
