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

## Mermaid 比我们多了什么（差距在哪）

### 1. Parser 层：我们少了一整层中间数据库

| 我们 | Mermaid |
|------|---------|
| parseDiagram → 直接出 `{nodes, edges}` | Parser → **FlowDB** → LayoutData |

FlowDB 是 Mermaid 的核心资产。它不只是存节点和边，还存：
- 子图的父子关系
- 节点样式（菱形决策、圆角矩形等）
- CSS class 引用
- 链接（点击跳转）

**我们没有这层**，所以 `parseDiagram` 直接吐出扁平数据，后续想加子图支持时，数据结构撑不住。

### 2. 布局层：Mermaid 包了 Dagre，不是裸调

**关键源码文件**: `packages/mermaid/src/rendering-util/layout-algorithms/dagre/index.js`

Mermaid 对 Dagre 做的封装：

| 功能 | Mermaid | 我们 |
|------|:-------:|:---:|
| 嵌套子图布局 | ✓ recursiveRender 递归布局 | ✗ 不支持 |
| 边交叉优化 | ✓ 后处理调整 | ✗ 没有 |
| 曲线插值类型 | 7种（linear/basis/cardinal/catmullRom/...） | 只有 smoothstep（XYFlow 默认） |
| 节点边界裁剪 | ✓ 线不会穿进节点里面 | ✓ XYFlow 自己处理 |
| 权重配置 | ✓ flowchart.ranksep / nodesep 可调 | 默认值 |

### 3. 连线渲染：Mermaid 是"精装修"

**关键源码文件**: `packages/mermaid/src/rendering-util/rendering-elements/edges.js`

| 维度 | Mermaid | 我们（XYFlow） |
|------|---------|---------------|
| 线型 | 可配置（直线/曲线/阶梯） | 只有 smoothstep（圆角折线） |
| 标签避让 | 标签不压线 | 标签可能重叠 |
| 端点裁剪 | 线到节点边界就停 | ✓ XYFlow 也做了 |
| 箭头 | 可配置样式 | XYFlow 默认箭头 |
| 交叉优化 | Dagre 返回后还会做二次调整 | **完全没有** |

### 4. 子图：Mermaid 有专门的 Cluster 渲染

**关键源码文件**: `packages/mermaid/src/rendering-util/rendering-elements/clusters.js`

Mermaid 把子图当成特殊的节点，有自己的背景框、标题、内边距。我们目前完全没有这个概念。

---

## "可读性差"的根本原因

不是"Dagre 不行"，而是：

1. **我们裸调 Dagre，Mermaid 是"精装 Dagre"**
   - 我们没有做线交叉优化
   - 我们没有做标签避让
   - 我们的曲线类型单一

2. **我们没有子图视觉表现**
   - `Prompt Assembly` 那组节点散着放，没有框包起来

3. **参数没调**
   - `ranksep` / `nodesep` 默认值偏大，图松散
   - 没有给主路径加权重

---

## 差距优先级与解决成本

| 差距 | 解决成本 | 建议顺序 |
|------|:-------:|:-------:|
| 调 Dagre 参数（ranksep/nodesep） | 低（改几行代码） | **先做** |
| 加子图渲染（Group 节点） | 中（XYFlow 支持 Group） | **接着做** |
| 连线标签避让 | 中（要算标签位置） | 后面做 |
| 线交叉优化 | 高（需要后处理算法） | 先忍忍 |
| 多曲线类型 | 低（XYFlow 支持） | 顺手改 |

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
