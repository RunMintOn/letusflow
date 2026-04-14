# .flow Custom Editor 设计

**日期：** 2026-04-14  
**目标：** 将 `.flow` 文件从“文本编辑器 + 命令打开预览面板”的模式迁移为 VS Code `Custom Text Editor`，让用户点击文件后直接进入交互式图形编辑器，同时保留手动切回文本编辑器的能力。

---

## 1. 背景与结论

当前 `.flow` 文件的使用链路是：

1. 先在 VS Code 文本编辑器中打开 `.flow`
2. 再执行 `Diagram Editor: Open Preview`
3. 侧边栏打开一个 Webview 预览面板

这个模型的主要问题是：

- 图形编辑与源码阅读割裂
- 打开路径长，需要额外命令
- 用户无法把它当成一个“真正的编辑器”

这次设计的结论是：

- **`.flow` 默认由 Custom Editor 打开**
- **旧的 `Diagram Editor: Open Preview` 命令直接移除**
- **图形编辑器成为主体验**
- **文本编辑器保留为 `Reopen With...` 的备用打开方式**

这不是纯视觉改造，而是 **VS Code 扩展入口与文档生命周期的迁移**。  
核心风险不在图形渲染，而在 **文档同步、错误处理、视图状态保持**。

---

## 2. 设计目标

### 必须满足

- 点击 `.flow` 文件时，默认在编辑器主区域打开图形编辑器
- 不再依赖命令手动打开预览
- 用户仍然可以手动切回文本编辑器
- 图形编辑器继续复用现有 React + XYFlow 渲染层
- 图形编辑修改仍然写回 `.flow` 文本
- 文本编辑器或外部修改 `.flow` 后，图形编辑器自动刷新
- 刷新时保留视图状态：
  - `viewport`
  - `backgroundStyle`
  - `layoutSpacing`
  - `edgeRenderMode`
- 文本变更后允许重置选中状态
- 非法 DSL 时 Custom Editor 不崩溃、不白屏
- 非法 DSL 时保留上一帧有效图，并显示错误提示

### 明确不做

- 不在本次实现完整 undo/redo 集成
- 不做复杂的图形状态与文本状态双向 merge
- 不追求多编辑器实例的高级协同同步
- 不保留旧的命令式预览入口

---

## 3. 推荐方案与取舍

### 方案 A：`CustomTextEditorProvider + 文档驱动全量 rerender`

这是推荐方案。

特点：

- 使用 `vscode.window.registerCustomTextEditorProvider`
- 打开 `.flow` 时直接创建 Webview
- 图形侧写回文本后仍然以文件内容为真相
- 文本变化后宿主重新解析并整页刷新 webview
- 刷新时显式保留视图状态

优点：

- 与当前架构最兼容
- 宿主逻辑清晰，容易验证
- 第一版最稳妥

缺点：

- 不是最细粒度的前端状态更新
- 文本变化时是全量刷新，不是增量 patch

### 方案 B：`Custom Editor + 增量 postMessage 更新`

不推荐作为第一版。

特点：

- 文本变化后不整页刷新
- 只给前端发送新的 graph/layout 数据
- 前端局部更新 React 状态

优点：

- 理论上更顺滑

缺点：

- 宿主和前端同步模型明显更复杂
- 很容易引入状态不一致
- 对当前 MVP 不必要

### 方案 C：保留旧命令链路作为兼容入口

不推荐。

优点：

- 迁移风险更低

缺点：

- 长期维持两套入口
- 用户心智不统一
- 与本次“默认即编辑器”的目标冲突

---

## 4. 体验与打开行为

### 默认行为

- 用户点击 `.flow` 文件
- VS Code 默认使用图形 Custom Editor 打开
- 编辑器主区域直接显示交互式流程图

### 备用行为

- 用户可通过 `Reopen Editor With...`
- 手动切换到文本编辑器查看或编辑 `.flow`

### 旧行为处理

- 删除 `Diagram Editor: Open Preview`
- 不再保留侧边栏预览模式作为官方入口

---

## 5. 架构设计

### 5.1 `package.json`

需要把扩展入口从“命令驱动”切换到“编辑器驱动”。

具体要求：

- 删除旧命令贡献：
  - `diagramEditor.openPreview`
- 删除旧命令对应 activation event
- 新增 `.flow` 的 `customEditors` 配置
- 让该 Custom Editor 成为默认打开方式

### 5.2 宿主入口

在 `src/extension.cjs` 中：

- 用 `registerCustomTextEditorProvider(...)` 替代当前 `registerCommand(...)`
- 实现 `resolveCustomTextEditor(document, webviewPanel, token)`

新的入口职责：

- 根据传入 `TextDocument` 初始化文档模型
- 为当前文档创建 webview
- 绑定 webview 消息处理
- 监听文档变化并刷新 webview

### 5.3 复用边界

现有系统中可以大量复用的部分包括：

- parser/model 逻辑
- serializer
- 自动布局
- React + XYFlow 前端
- Webview HTML 渲染函数

需要重构的是：

- 入口注册方式
- 文档生命周期管理
- 文本变化监听与 rerender 策略

---

## 6. 数据与状态原则

### 6.1 单一数据源

`.flow` 文件内容是唯一真相。

这意味着：

- 图形侧改动写回文本
- 文本侧改动覆盖图形表现
- 不做图形状态和文本状态的冲突合并

### 6.2 视图状态

以下状态属于视图偏好，不属于 `.flow` 语义：

- `viewport`
- `backgroundStyle`
- `layoutSpacing`
- `edgeRenderMode`

这些状态在文档刷新时必须保留。

### 6.3 选择状态

`selection` 不做持久化。

原因：

- 文本变化后节点可能已删除、重命名或重排
- 强行恢复选择状态风险大于收益

因此策略是：

- 文本驱动的刷新后允许清空当前选中项

---

## 7. 文档同步设计

### 7.1 初始化

`resolveCustomTextEditor(document, webviewPanel)` 初始化时应执行：

1. 读取 `document.getText()`
2. 解析为 `graph`
3. 计算 `layout`
4. 读取当前文档对应的 view state
5. 构造 webview payload
6. 注入 HTML

### 7.2 文本变更到图形刷新

宿主应监听：

- `vscode.workspace.onDidChangeTextDocument`

只处理当前 `document.uri` 对应的 `.flow` 文档。

同步策略：

- 文本变化后对刷新做轻量 debounce
- debounce 后重新读取当前 `document.getText()`
- 重新解析并重建 payload
- rerender webview

### 7.3 图形改动到文本写回

当前图形交互链路继续沿用：

- Webview 发消息给宿主
- 宿主更新 graph
- `serializeDiagram(graph)` 回写 `.flow`

这条链路不因 Custom Editor 而改变其核心模型。

### 7.4 避免无意义抖动

图形侧写回文本后，也可能触发 `onDidChangeTextDocument`。

第一版不做复杂增量同步，但宿主应避免明显的重复抖动。

可接受策略：

- 用短时间窗口或版本号识别“本次更新来自 webview”
- 或者在 rerender 前做最小必要判断

本次不要求实现复杂 diff，只要求体验稳定。

---

## 8. 错误处理设计

### 8.1 非法 DSL

当文本被改成非法 DSL 时：

- Custom Editor 不应白屏
- 不应把图清空成空白状态
- 不应丢失当前 view state

### 8.2 推荐表现

宿主解析失败时：

- 保留上一帧成功解析的 document payload
- 向 webview 注入错误信息

Webview 表现：

- 显示错误提示区域
- 告知当前仍展示上一次有效图
- 用户修正 DSL 后，下一次解析成功即恢复正常

### 8.3 错误边界

本次错误处理只要求覆盖：

- parser 抛错
- 基础数据构建失败

不要求在本次设计复杂的恢复面板或多级诊断 UI。

---

## 9. 宿主代码组织建议

不建议把当前 `openPreview()` 直接原地膨胀成更大的函数。

建议改成：

- 一个面向文档的公共初始化/绑定流程
- `resolveCustomTextEditor()` 调用它

推荐职责拆分：

- 注册入口
- 文档模型加载
- webview 渲染
- message handling
- text document change handling
- view state storage

这能避免 `extension.cjs` 继续失控增长。

---

## 10. 测试设计

### 10.1 自动化测试

至少补以下几类：

- `package.json` 契约测试
  - 存在 `.flow` custom editor 声明
  - 不再暴露旧命令入口

- extension 宿主契约测试
  - 使用 `registerCustomTextEditorProvider`
  - 处理文档变化监听
  - 刷新时保留 view state

- payload / render 测试
  - 非法 DSL 场景可带出错误状态字段
  - 正常 payload 仍可注入 webview

- bridge / message contract 测试
  - 图形侧消息仍可正常写回文本

### 10.2 手工验证

必须至少验证：

1. 点击 `.flow` 直接打开图形编辑器
2. `Reopen With Text Editor` 可用
3. 图形编辑后 `.flow` 文本正确保存
4. 文本侧修改后图形自动刷新
5. 刷新后视口不跳回初始位置
6. 背景/间距/边样式保持
7. 非法 DSL 时不白屏，且保留上一帧有效图

---

## 11. 风险与控制

### 风险 1：Custom Editor 生命周期改造后，图形编辑不再稳定保存

控制方式：

- 尽量复用现有写回逻辑
- 把变更集中在入口与同步层

### 风险 2：文本变化导致视口重置，体验倒退

控制方式：

- 明确把 view state 从 graph state 中分离
- 每次 rerender 都回灌当前 view state

### 风险 3：非法 DSL 导致白屏

控制方式：

- 维持上一帧成功 payload
- 单独注入错误状态

### 风险 4：入口迁移后，用户无法回到文本模式

控制方式：

- 依赖 VS Code 标准 `Reopen With...`
- 在测试中显式验证

---

## 12. 复杂度结论

这项工作属于**中复杂度**，不是低复杂度。

原因：

- 需要修改扩展入口声明
- 需要从命令驱动迁移到文档驱动生命周期
- 需要处理文本变更同步与错误状态
- 需要保留 view state，避免刷新时体验倒退
- 需要补宿主层和行为层测试

它的复杂度不在算法，而在 **VS Code Custom Editor 的接入与同步模型**。

因此后续应继续按中复杂度流程推进：

- 先写 implementation plan
- 再执行代码改动
- 最后做自动化与 Extension Host 人工验证
