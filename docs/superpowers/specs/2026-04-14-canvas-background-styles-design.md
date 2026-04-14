# Canvas 背景样式设计

**日期：** 2026-04-14  
**目标：** 为 Webview 画布增加可切换、可持久化的背景样式，在保留浅色 / 深色模式的前提下，新增接近 Obsidian Canvas 的暖深灰点阵背景，并保留现有渐变背景作为独立样式。

---

## 1. 背景与结论

当前 Webview 已有一层基础画布背景和 XYFlow `Background` 组件，但存在两个问题：

- 深色模式下背景层次还不够明确
- 点阵存在感偏弱，离参考图的 Obsidian Canvas 气质有明显差距

这次设计的结论是：

- **保留 VS Code 的浅色 / 深色主题能力**
- **新增独立于主题的“背景样式”选择**
- **背景样式按当前 `.flow` 文件持久化**
- **默认保留现有渐变背景，并新增 Obsidian 风格点阵背景**

背景样式不是 DSL 能力，也不是图模型能力。  
它属于 **Webview 视图偏好**，应当沿用当前 `layoutSpacing`、`edgeRenderMode`、`viewport` 这类“预览层状态”的思路处理。

---

## 2. 设计目标

### 必须满足

- 保留现有浅色 / 深色模式
- 顶部工具栏新增背景样式选择控件
- 至少提供 3 种背景样式：
  - `paper`
  - `obsidian`
  - `gradient`
- `obsidian` 样式在深色模式下要接近参考图：
  - 暖深灰底
  - 清晰但克制的点阵
  - 不增加多余装饰元素
- 背景样式在关闭并重新打开同一 `.flow` 预览后仍然保持
- 不修改 `.flow` DSL 语法
- 不新增 sidecar 文件

### 明确不做

- 不调整节点、边、分组的结构和交互
- 不新增背景图片资源
- 不做任意自定义配色器
- 不做每个样式的独立复杂配置项

---

## 3. 推荐方案与取舍

### 方案 A：使用 `workspaceState` 按 `sourcePath` 保存背景样式

这是推荐方案。

优点：

- 不污染 `.flow` 源文件
- 不需要扩展 DSL
- 不需要额外 sidecar 文件
- 与当前 Webview 视图状态的职责一致

缺点：

- 样式选择不随仓库同步
- 换机器或换用户不会自动继承

### 方案 B：新增视图 sidecar 文件

不推荐。

优点：

- 可版本管理、可共享

缺点：

- 需要定义新文件格式
- 增加文件管理和同步复杂度
- 对当前需求明显过重

### 方案 C：把背景样式写入 `.flow`

不推荐。

优点：

- 单文件自包含

缺点：

- 污染 DSL
- 需要改 parser / serializer
- 视图偏好与图结构耦合

---

## 4. 状态模型

新增一个独立的视图状态字段：

```js
backgroundStyle: 'paper' | 'obsidian' | 'gradient'
```

它与现有状态的关系如下：

- `theme mode`
  - 来源于 VS Code 注入的 body class 与 `prefers-color-scheme`
  - 负责 light / dark token
- `backgroundStyle`
  - 来源于宿主注入的文档载荷
  - 负责画布背景样式变体

这两个维度独立组合。例如：

- light + paper
- dark + obsidian
- dark + gradient

---

## 5. 数据流设计

```text
TopToolbar select
      |
      v
webview state.backgroundStyle
      |
      v
postMessage({ type: 'setBackgroundStyle', value })
      |
      v
extension host
      |
      v
context.workspaceState.update(storageKey(sourcePath), value)
      |
      v
rerender webview with backgroundStyle
```

### 宿主侧

在 `src/extension.cjs` 中新增：

- 读取当前文件对应的 `backgroundStyle`
- 把它注入 `documentModel`
- 处理 `setBackgroundStyle` 消息
- 写入 `context.workspaceState`
- 触发 rerender

建议存储 key 规则：

```text
diagramEditor.backgroundStyle:<sourcePath>
```

若没有存储值，则回退到默认值：

```text
paper
```

### Webview 载荷

在 `buildWebviewDocumentPayload` 中新增：

- `backgroundStyle`

### 前端状态

在 `App.jsx` 中新增本地 state：

- 从初始文档读取 `backgroundStyle`
- 工具栏切换时立即更新前端显示
- 同时发消息给宿主持久化

---

## 6. UI 设计

### 顶部工具栏

在现有工具栏中新增一个背景样式选择控件，位置与边样式、间距控制保持同一层级。

建议文案：

- 标签：`背景`
- 选项：
  - `纸面`
  - `点阵`
  - `渐变`

内部值分别映射到：

- `paper`
- `obsidian`
- `gradient`

这里使用 `select` 足够，不需要额外按钮组或图标切换器。

---

## 7. 视觉设计

### 7.1 `paper`

用途：

- 作为最稳妥的基础背景
- 在浅色模式下保持现在的阅读友好感

视觉要求：

- 低对比纯底或轻微纸面色
- 点阵关闭或接近不可见
- 不强调氛围感

### 7.2 `obsidian`

这是本次核心样式。

视觉要求：

- 底色为偏暖的深灰，不走纯黑，也不走蓝灰
- 有非常轻的亮度起伏，但不能抢过点阵
- 点阵要稳定可见，间距均匀，大小小而明确
- 点的颜色应比底色略亮，并保持暖灰气质
- 整体参考 Obsidian Canvas，而不是科技感网格

实现原则：

- 使用 CSS 变量控制底色、点色、点阵透明度
- 保留一层极轻的氛围渐变，但不让它成为主角
- 优先复用 XYFlow `Background`
- 如果 XYFlow 的点阵样式在实际渲染中仍不够接近目标，则允许补一层纯 CSS 背景来加强视觉控制

### 7.3 `gradient`

用途：

- 保留这次试出来的氛围背景，作为第三种可选风格

视觉要求：

- 保留当前渐变层次感
- 可以弱化点阵，避免和 `obsidian` 重叠
- 深色和浅色下都要保持一致的“柔和氛围”方向

---

## 8. 组件与文件改动范围

预计涉及以下文件：

- `src/extension.cjs`
  - 读取 / 保存背景样式
  - 注入 webview payload
  - 处理消息协议
- `src/webview/buildWebviewDocumentPayload.js`
  - 增加 `backgroundStyle`
- `src/webview-app/App.jsx`
  - 管理背景样式 state
  - 响应工具栏切换
- `src/webview-app/components/TopToolbar.jsx`
  - 新增样式选择控件
- `src/webview-app/components/FlowCanvas.jsx`
  - 接收样式 class 或 data attribute
- `src/webview-app/index.css`
  - 定义三种背景样式在 light / dark 下的变量和表现

---

## 9. 测试设计

至少补下面几类测试：

- `render-graph-html` / payload 相关测试
  - 确认 `backgroundStyle` 被注入
- extension message contract 测试
  - 确认支持 `setBackgroundStyle`
- toolbar / 组件级测试
  - 确认存在背景选择控件
- 必要的源码契约测试
  - 确认 `FlowCanvas` 使用背景样式 class 或属性钩子

本次不要求做视觉截图测试，但样式命名和状态流必须可验证。

---

## 10. 风险与控制

### 风险 1：点阵仍然不够接近参考图

控制方式：

- 不把实现绑定死在 XYFlow 默认表现上
- 给 CSS 留出额外背景层的空间

### 风险 2：主题模式与背景样式互相覆盖，导致样式混乱

控制方式：

- 主题只负责 token
- 背景样式只负责画布变体
- 避免在多个组件内分散写条件分支

### 风险 3：持久化链路与现有 rerender 行为冲突

控制方式：

- 复用现有 `setSpacing` / `setEdgeRenderMode` 的消息模型
- 把 `backgroundStyle` 明确作为 document payload 的一部分

---

## 11. 实施结论

这项工作属于**中等复杂度**：

- 视觉上是背景样式改造
- 技术上其实是“新增一个按文件持久化的视图偏好”
- 需要打通工具栏、webview 状态、host 消息、workspaceState、样式系统和测试

因此后续应按中等复杂度流程推进：

- 先写实现计划
- 再执行代码改动
- 最后做测试与构建验证
