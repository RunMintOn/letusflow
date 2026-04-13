# Diagram Editor MVP

## Run

1. Open this folder in VS Code.
2. Press `F5` to launch the extension host.
3. Create or open a `.flow` file.
4. Run `Diagram Editor: Open Preview`.

## DSL

```text
dir LR

node start "开始"
node review "审批"
node done "完成"

edge start -> review
edge review -> done "通过"
```

Layout is stored in:

```text
example.flow.layout.json
```
