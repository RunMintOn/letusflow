# DSL 语法设计与实现清单

## 核心语法评估

```
┌────────┬─────────┬──────────────────────────────────────┐
│ 关键字 │ 状态    │ 评价                                 │
├────────┼─────────┼──────────────────────────────────────┤
│ dir    │ ✅ 稳定 │ 就两个值 LR/TD，没得改               │
│ group  │ ✅ 稳定 │ 扁平分组，不支持嵌套，简单够用       │
│ node   │ ✅ 稳定 │ ID + 标签分离，in 引用分组，设计合理 │
│ edge   │ ⚠️ 稳定 │ 直观，但样式扩展需改解析器（待优化）  │
└────────┴─────────┴──────────────────────────────────────┘
```

**核心语法已冻结**，后续只加可选扩展，不改已有规则。

---

## 待实现清单

### P1 — 注释支持 `#` / `//`

**优先级：** ⭐⭐⭐ 最实用  
**成本：** 极低（~3 行改动）  
**影响：** 向后兼容，现有文件不受影响

**实现方案：**

在 `parseDiagram.js` 的 `line` 过滤逻辑中，跳过以 `#` 或 `//` 开头的行：

```js
// 跳过注释
if (line.startsWith('#') || line.startsWith('//')) continue
```

**改动文件：**
- `src/model/parseDiagram.js` — 1 处修改

---

### P2 — 节点类型扩展（可选）

**优先级：** ⭐⭐ 视需求而定  
**成本：** 低（~10 行改动）  
**影响：** 向后兼容，`type` 属性可选，不写默认矩形

**语法示例：**

```
node decision "需要工具？" type=decision
node start "开始" type=round
```

**实现方案：**

1. 解析器扩展 `node` 正则，匹配 `type=xxx` 后缀
2. `toFlowNodes.js` 根据 `type` 值映射到不同节点渲染组件

**改动文件：**
- `src/model/parseDiagram.js` — 修改 node 正则
- `src/webview-app/mapping/toFlowNodes.js` — 增加 type 映射

---

### P3 — 边样式扩展（可选）

**优先级：** ⭐⭐ 视需求而定  
**成本：** 低（~10 行改动）  
**影响：** 向后兼容，`dotted`/`dashdot` 等新关键字可选

**语法示例：**

```
edge review -> done "通过"
edge review -> revise "驳回" dashed
edge review -> retry "重试" dotted
edge review -> fallback dashed "降级"
```

**实现方案：**

1. 解析器将 `edge` 正则的 `dashed` 改为更通用的 `(dashed|dotted|dashdot)`
2. `toFlowEdges.js` 增加映射表：

```js
const STYLE_MAP = {
  dashed:  { strokeDasharray: '4 4' },
  dotted:  { strokeDasharray: '1 4' },
  dashdot: { strokeDasharray: '4 2 1 2' },
}
```

**改动文件：**
- `src/model/parseDiagram.js` — 修改 edge 正则
- `src/webview-app/mapping/toFlowEdges.js` — 增加样式映射

---

### ❌ 不推荐 — ID 自动回退

**提案：** 允许省略 ID，自动生成 `node_1`、`node_2` 等

```
node "用户输入"    → 自动分配 node_1
```

**不推荐理由：**
- 增加解析器复杂度
- 生成的 ID 不易读，调试困难
- 现有语法已经够清晰，没有明显痛点

---

## 建议执行顺序

```
1. 注释支持（# / //）     ← 成本最低，立刻做
2. 边样式扩展（可选）      ← 如有需求，顺手做
3. 节点类型扩展（可选）    ← 等有明确需求再做
```

核心语法（`dir` / `group` / `node` / `edge`）保持冻结，任何新增语法必须是**可选的、向后兼容的**。


# type关键字
这个绿色的来源是 src/webview-app/index.css 里的：
    --node-fill: #2f3321; （这是一种深橄榄绿）
    --node-stroke: #8d9560; （边框是浅绿）

    在深色背景下，这个绿色确实显得有点“脏”或者“旧”，不如纯灰或者纯黑显得现代。

    你的痛点分析
    你不想加 color="#ff0000" 这种语法，是因为：
     1. 写起来累：谁画图的时候还要去查 Hex 色值？
     2. 解析麻烦：要在正则里多加匹配逻辑。
     3. 不统一：每个人用的颜色不一样，图就乱了。

    ---

    我的建议方案：不要“自定义颜色”，要做“语义化预设”

    既然你觉得 Obsidian Canvas 好，其实 Canvas
    的核心逻辑不是“随便选色”，而是“有限的几种高亮色”。

    我建议用 `type` 属性做扩展，而不是 color 属性。

    方案：扩展 type 关键字

    目前的语法已经支持了
    type=decision（菱形）。我们可以顺势加几个语义化的类型，直接映射到 CSS 样式。

    1. 语法层面（用户怎么写）
    用户不需要记颜色代码，只需要记几个单词：

     1 node start "开始" type=start        # 绿色/圆角（默认）
     2 node error "出错了" type=error      # 红色边框/填充
     3 node warning "注意" type=warning    # 黄色边框
     4 node info "日志" type=info          # 蓝色边框
     5 node action "执行" type=action      # 紫色边框

    2. 实现层面（你怎么做）

     * DSL 解析器 (`parseDiagram.js`)：
        目前的正则已经能抓到 type=xxx 了，几乎不用改。只要把 decision
    之外的值也存进节点对象里就行。

     * 渲染层 (`FlowCanvas.jsx` / `index.css`)：
        只需要加几个 CSS 类名映射。

      1 /* 默认节点（灰色） */
      2 .react-flow__node {
      3   background: #2a2a2a; /* 把那个丑绿色换成中性灰 */
      4   border-color: #555;
      5 }
      6
      7 /* 红色节点 */
      8 .react-flow__node-type-error {
      9   background: #3a1c1c;
     10   border-color: #ff4d4f;
     11 }
     12
     13 /* 蓝色节点 */
     14 .react-flow__node-type-info {
     15   background: #1c2a3a;
     16   border-color: #1890ff;
     17 }

    为什么这个方案好？

     1. 复杂度几乎为 0：你不需要引入颜色选择器，不需要处理 Hex 解析。
     2. 用户友好：用户打字 type=error 比写 color="#ff0000" 快得多，而且能自动补全。
     3. 视觉统一：整个项目的配色由你（开发者）在 CSS 里统一控制，保证图好看。
     4. 向后兼容：不写 type 的节点自动走默认灰色，旧图不受影响。

    总结建议

    第一步： 先把 CSS 里的全局绿色换成中性深灰（比如 #252525），解决“太丑”的问题。
    第二步： 如果后续确实需要高亮某些节点，再加 type=error
    这种语义化标签，千万别做自由取色器。



    它们是正交的，各管各的：
     - group 是容器（画框），管位置归类和背景区域。
     - type 是节点属性（节点本身），管形状和颜色。
     - 语法书写顺序随意，解析器会先收集所有定义，渲染时先画分组框，再在上方画带样式的节点。

    ---

    最终语法规范（示例）

     1 dir TD
     2 group tools "工具集"
     3
     4 node A "开始" type=start                   # 仅类型
     5 node B "决策" in tools type=decision       # 分组 + 类型
     6 node C "报错" type=error                   # 仅类型
     7 edge A -> B "进入" dashed                  # 连线样式

    ---

    实施路线图（按优先级）

     1. 🎨 视觉修复（立即，0 语法改动）
        - 改 index.css：把默认节点色从橄榄绿换成中性深灰 #2a2a2a。
        - 效果：所有旧图瞬间变现代，不碰解析器。

     2. 📝 注释支持（P1）
        - 解析器加 1 行过滤：if (line.startsWith('#') || line.startsWith('//')) continue
        - 成本极低，方便调试。

     3. 🏷️ 节点类型扩展（P2）
        - 解析器匹配 type=xxx 后缀，存入节点对象。
        - 渲染层映射 CSS 预设类（decision/error/start 等）。
        - 限制：只允许预设关键字，不开放自由 Hex 调色。

     4. ➖ 边样式扩展（P3，视需求）
        - 解析器扩展 (dashed|dotted|dashdot)。
        - 渲染层加 strokeDasharray 映射表。

    ---

    避坑原则
     - group 和 type 互不覆盖，节点可同时拥有。
     - 不写 type 默认走基础矩形灰色，绝对向后兼容。
     - 所有新增关键字必须是可选的、预设的，不增加用户记忆负担。

    按这个顺序走，逻辑清晰，无冲突风险。确认后即可开工。

         2. type 是否同时绑定形状和颜色？
       是的，完全正确。type 是一个打包预设。你写 type=decision，系统就自动应用“菱形 +
    黄色边框”；写 type=error 就自动应用“矩形 +
    红色边框”。形状和颜色是强绑定的，你不需要、也不能分开指定。