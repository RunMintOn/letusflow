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
