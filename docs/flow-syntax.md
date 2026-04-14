# .flow 语法文档

`.flow` 是一种用于描述流程图的轻量级声明式 DSL。它以纯文本形式定义节点和有向边，支持方向配置、节点分组和带标签的连线。

---

## 文件结构

一个 `.flow` 文件由四个部分组成（可选，顺序可变）：

```
dir LR
# 分组声明
group prompt "Prompt Assembly"
// 节点定义
node start "开始"
edge start -> end "完成"
```

> **注意：** 仅支持**整行注释**。去掉前导空白后，以 `#` 或 `//` 开头的整行会被忽略；暂不支持行尾注释。空行也会被自动忽略。

---

## 1. 方向配置 `dir`

设置图的整体布局方向。

```
dir LR    # 从左到右（默认）
dir TD    # 从上到下
```

**可选值：**
- `LR` — Left to Right
- `TD` — Top to Bottom
- `TB` — Top to Bottom（`TD` 的别名，效果相同）

> 如果不写 `dir`，默认为 `LR`。

---

## 2. 节点分组 `group`

声明一个逻辑容器，用于将相关节点归类渲染。

```
group prompt "Prompt Assembly"
```

**语法：**
```
group <组ID> "<组标题>"
```

- **组ID**：字母、数字、连字符或下划线（`[A-Za-z0-9_-]+`）
- **组标题**：用双引号包裹的任意字符串，支持转义

> **重复 ID 处理：** 如果同一个组 ID 被多次声明，只有第一次生效，后续声明会被静默忽略。

---

## 3. 节点定义 `node`

定义图中的一个节点。

```
node start "开始"
node U "User Input"
node A1 "A1 identity system prompt" in prompt
node decision "需要工具？" type=decision
node answer "结束" type=end colour=#d14d8b
```

**语法：**
```
node <节点ID> "<节点标签>" [in <组ID>] [type=<节点类型>] [color=<颜色名或#hex>]
```

- **节点ID**：字母、数字、连字符或下划线
- **节点标签**：用双引号包裹的显示文本
- **`in <组ID>`**：可选，将节点归属到指定分组
- **`type=<节点类型>`**：可选，决定节点的形状和默认主题色
- **`color=<颜色名或#hex>` / `colour=<颜色名或#hex>`**：可选，覆盖节点默认颜色；序列化时统一写回 `color=`

**当前内置 `type` 预设：**

- **`default`**：矩形
- **`decision`**：菱形
- **`start`**：圆角矩形
- **`end`**：胶囊形
- **`input`**：平行四边形

> **重复 ID 处理：** 如果同一个节点 ID 被多次定义，只有第一次生效，后续定义会被静默忽略。

---

## 4. 连线定义 `edge`

定义两个节点之间的有向边。

```
edge start -> end
edge review -> done "通过"
edge review -> revise "驳回" dashed
edge review -> retry "重试" dotted
edge review -> fallback "降级" dashdot
edge A -> B dashed
```

**语法：**
```
edge <起点ID> -> <终点ID> ["<连线标签>"] [dashed|dotted|dashdot]
```

- **`->`**：箭头符号，表示方向
- **`"<连线标签>"`**：可选，显示在连线上的文字
- **`dashed`**：可选，将连线渲染为虚线
- **`dotted`**：可选，将连线渲染为点线
- **`dashdot`**：可选，将连线渲染为点划线

> **注意：** 当前样式关键字必须放在标签后面；`edge A -> B dashed "说明"` 仍然是非法语法。

---

## 完整示例

```
dir TD

group assembly "Prompt Assembly"

node start "用户输入"
node build "构建上下文"
node llm "调用 LLM"
node decision "需要工具？" type=decision
node tool "执行工具" type=input
node result "追加结果"
node answer "返回回答" color=blue
node end "结束" type=end colour=#d14d8b

node sys1 "系统提示词" in assembly
node tools "工具列表提示" in assembly
node msgs "provider messages" in assembly

edge start -> build
edge build -> llm
edge llm -> decision
edge decision -> tool "是"
edge tool -> result
edge result -> build
edge decision -> answer "否"
edge answer -> end

edge sys1 -> msgs
edge tools -> msgs
```

---

## 转义规则

标签中使用双引号或反斜杠时，需要转义：

```
node ex "He said \"hello\""
node path "C:\\Users\\test"
```

支持的转义序列：
- `\"` — 字面量双引号
- `\\` — 字面量反斜杠

---

## 与 Mermaid 对比

| 特性 | .flow | Mermaid |
|------|-------|---------|
| 节点定义 | 显式 `node` 声明 | 隐式（在连线中首次出现） |
| 连线标签 | `edge A -> B "label"` | `A -->|label| B` |
| 虚线 | `edge A -> B dashed` | `A -.-> B` |
| 点线 | `edge A -> B "label" dotted` | 不直接支持 |
| 点划线 | `edge A -> B "label" dashdot` | 不直接支持 |
| 分组 | `group` 声明 + `in` 引用 | `subgraph...end` 嵌套 |
| 手动布局 | 不需要（自动排版） | 不需要（自动排版） |

---

## 常见错误

| 错误信息 | 原因 | 解决方法 |
|----------|------|----------|
| `Unknown line: ...` | 使用了不支持的关键字或写法 | 检查是否把样式写在标签前、或写了不支持的语法 |
| `Invalid node line: ...` | `type` / `color` / `colour` 写法不合法 | 检查是否使用了无空格颜色名或 `#hex` |
| `Invalid escape sequence` | 使用了不支持的转义序列 | 仅使用 `\"` 和 `\\` |
| 节点/分组不显示 | 重复定义了相同的 ID | 确保每个节点/分组 ID 唯一 |

---

## VS Code 集成

在 VS Code 中打开 `.flow` 文件后，会默认使用自定义编辑器：

```
Flow Diagram Editor
```

如果当前文件是以普通文本方式打开，可执行：

```
Reopen Editor With...
```

然后选择 `Flow Diagram Editor`，即可切换到图形编辑视图。
