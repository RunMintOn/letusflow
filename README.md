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
- 拖拽节点并写回 `.flow.layout.json`
- 在右侧属性面板里修改节点文字并写回 `.flow`
- 点击 `新增节点`
- 直接从一个节点连到另一个节点

## 文件模型

```text
example.flow
example.flow.layout.json
```

- `.flow` 保存语义结构
- `.flow.layout.json` 保存节点坐标和尺寸

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
