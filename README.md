# Diagram Editor MVP

## 运行

1. 在 VS Code 打开这个项目目录。
2. 运行 `npm install`。
3. 运行 `npm run build`。
4. 打开 `Run and Debug`，选择 `Run Diagram Editor MVP`。
5. 按 `F5` 打开 Extension Host 窗口。
6. 在新窗口里打开 `example.flow`。
7. 执行命令 `Diagram Editor: Open Preview`。

## 当前可验证能力

- 读取 `.flow` DSL 并渲染到 Webview
- 使用 dagre 自动生成流程图布局
- 拖拽节点做临时查看调整，不写回磁盘
- 在右侧属性面板里修改节点文字并写回 `.flow`
- 点击 `新增节点`
- 直接从一个节点连到另一个节点
- 点击 `整理布局` 恢复算法布局

复杂度验收样例：

```text
complex-runtime.flow
```

## 视觉验收目标

`complex-runtime.flow` 是第一阶段视觉验收样例。它应该和 `mermaid例图.md` 的 Mermaid 渲染结果对比，但不做像素级复刻。

验收点：

- 图能正常打开，不出现空白 Webview。
- 第一眼是自上而下的流程图，不是编辑器调试画布。
- 默认连接点隐藏，只在 hover 或选中时出现。
- 连线比节点更轻，并且箭头方向清楚。
- 连线标签可读，但不抢占视觉主体。
- `Prompt Assembly` 显示为轻量分组边界。
- 整体密度足够通过缩放和平移查看，不再像一屏只有少量节点的松散图。

## 文件模型

```text
example.flow
```

- `.flow` 保存语义结构
- 节点坐标由 dagre 在打开文件或整理布局时生成
- `.layout.json` 不再作为真数据源；旧文件可以忽略或删除

## DSL 示例

```text
dir LR

node start "开始"
node review "审批"
node revise "补充信息"
node done "完成"

edge start -> review
edge review -> done "通过"
edge review -> revise "驳回"
edge revise -> review
```
