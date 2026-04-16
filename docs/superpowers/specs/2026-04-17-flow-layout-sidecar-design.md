# .flow + layout.json 双文件编辑器设计

## 目标

将当前项目从“`.flow` 单文件 + 自动布局主导”的路线，切换为“`.flow` 负责语义、`layout.json` 负责稳定空间编辑”的双文件系统。

Phase 1 的核心目标不是继续增强自动布局，而是建立新的真相边界：

- `.flow` 是对 AI 友好的语义层
- `.flow.layout.json` 是对人友好的空间层
- 用户是布局的最终作者
- 自动布局是辅助能力，而不是默认裁判

一句话定义：

**对 AI 友好的语义编辑器，对人友好的稳定画布编辑器。**

## 现状与问题

当前项目的主要前提是：

- `.flow` 作为唯一真相
- 布局在打开文件时由自动布局推导
- 拖拽不是正式持久化编辑
- 自动布局在产品叙事上处于主导地位

这条路线的主要问题不是“布局引擎不够强”，而是产品站错了边：

- AI 需要的是低 token、易生成、易修改的语义表示
- 人需要的是稳定位置、空间记忆和可逐步整理的画布
- 单一表示法无法同时把两者做到极致

继续围绕单文件自动布局优化，只会不断强化“算法主导布局”的旧路线，而这与本项目新的目标相冲突。

## 核心原则

### 1. 语义与布局分层

- `.flow` 只存结构、关系、身份和文本语义
- `.flow.layout.json` 只存空间相关数据

### 2. 用户拥有布局最终决定权

- 拖拽不是临时预览操作，而是正式编辑行为
- 用户手动整理出的空间结构需要被系统承认并持久化

### 3. 自动布局降级为辅助工具

- 首次缺少布局时，可以给出初始布局
- 用户点击“整理布局”时，可以显式重排
- 自动布局不再是每次结构变化后的默认统治逻辑

### 4. 快速落地优先

- Phase 1 允许 serializer 直接重写 `.flow`
- 不优先保注释、空行和原排版
- 只保证语义正确和结构稳定

### 5. 边的空间意图必须有稳定身份

- `edge id` 必须成为 `.flow` 语义层的一部分
- 边的空间信息必须挂在持久 `edge id` 上
- 不依赖运行时 `edge_1` / `edge_2` 这种临时身份

## 推荐路线

本次改造采用：

**保留现有编辑器外壳，直接重做核心数据流。**

保留的部分：

- VS Code Custom Editor 外壳
- React Flow / XYFlow 画布层
- 现有 `.flow` parser / serializer 的基本形态
- 节点、边、group 的基础渲染组件

重做的部分：

- 文档加载模型
- 布局 sidecar 读写
- 宿主与 webview 的同步协议
- 拖拽与结构编辑的写回逻辑
- 自动布局的角色定位

不采用双轨兼容，也不另起一套 V2 编辑器。

## 文件模型

### 1. 语义文件：`<name>.flow`

负责：

- `dir`
- `group`
- `node`
- `edge`
- 节点和 group 的身份与归属关系
- 边的持久 `edge id`

Phase 1 中，`.flow` 不承担任何位置语义。

### 2. 布局文件：`<name>.flow.layout.json`

负责：

- 节点布局
- group 布局
- 边的侧边挂靠信息

Phase 1 最小结构：

```json
{
  "version": 1,
  "nodes": {},
  "groups": {},
  "edges": {}
}
```

#### 节点布局

节点布局存：

- `x`
- `y`
- `w`
- `h`

#### group 布局

group 布局也存：

- `x`
- `y`
- `w`
- `h`

group 在 Phase 1 是正式布局对象，不再只是包围盒派生物。

#### 边布局

边布局以 `edge id` 为 key，Phase 1 只存：

- `sourceSide`
- `targetSide`

不存整条边的完整路径、不存折线拐点、不存 bezier 控制点。

示例：

```json
{
  "version": 1,
  "nodes": {
    "start": { "x": 80, "y": 120, "w": 140, "h": 56 }
  },
  "groups": {
    "prompt": { "x": 40, "y": 80, "w": 420, "h": 260 }
  },
  "edges": {
    "e_review_pass": {
      "sourceSide": "right",
      "targetSide": "top"
    }
  }
}
```

## `.flow` 语法扩展

### 1. `edge id` 正式进入 DSL

Phase 1 为 `edge` 增加可选 `id=...` 属性：

```flow
edge start -> review "通过" id=e_review_pass
edge review -> done id=e_review_done
```

要求：

- 新建边时生成持久 `edge id`
- 打开旧文件时，缺失 `id` 的边自动补齐
- 后续 serializer 允许把升级后的 `.flow` 写回

### 2. 旧文件升级策略

兼容读取：

- 没有 `layout.json` 的旧 `.flow`
- 没有 `edge id` 的旧 `.flow`

升级策略：

- 打开后自动补 `edge id`
- 自动生成 `layout.json`
- 后续保存按新模型写回

兼容的是“读入旧文件”，不是“长期维持旧模型”。

## 运行时文档模型

运行时统一文档模型包含四块：

- `source`
- `graph`
- `layout`
- `viewState`

其中：

- `source` 是 `.flow` 文本
- `graph` 是解析后的语义结构
- `layout` 是 `layout.json` 内容
- `viewState` 是临时视图状态

Phase 1 不把 `viewport` 纳入持久化布局，因此 `viewState` 不进入 `layout.json`。

## 加载链路

打开 `<name>.flow` 时，宿主按以下顺序工作：

1. 读取 `.flow`
2. 解析 graph
3. 为旧边补 `edge id`
4. 如果 `.flow` 因升级发生变化，允许后续保存写回
5. 读取 `<name>.flow.layout.json`
6. 如果 sidecar 不存在，则自动生成
7. 对 `graph` 与 `layout` 做 reconcile
8. 将统一的 `DocumentModel` 同步到 webview

新的核心链路是：

`.flow + layout.json -> reconcile -> render`

不再是：

`.flow -> autoLayout -> render`

## Reconcile 规则

Reconcile 的原则是：

**尽量保留已有布局，只补缺口，不洗全图。**

### 1. 节点

- sidecar 里已有节点布局则保留
- 缺失布局的节点补初始 `x/y/w/h`
- layout 中已不存在的节点布局要清理

### 2. group

- sidecar 里已有 group 布局则保留
- 缺失布局的 group 补初始 `x/y/w/h`
- 已删除 group 的布局要清理
- group 成员变化时，保留用户已有 box，不做粗暴覆盖

### 3. 边

- sidecar 里已有 `sourceSide/targetSide` 则保留
- 缺失边布局时补默认侧或连接时选中的侧
- 已删除边的布局数据要清理

## 写回规则

写回规则严格分层：

### 1. 改语义，写 `.flow`

包括：

- 新增 / 删除节点
- 新增 / 删除边
- 新增 / 删除 group
- 修改节点标签
- 修改 group 标题
- 调整节点归组关系

### 2. 改空间，写 `layout.json`

包括：

- 节点拖拽
- group 拖拽
- 边挂靠侧变更
- 显式整理布局

### 3. 同时改两边的操作

有些操作会同时写 `.flow` 和 `layout.json`：

- 新建边：写 `.flow` 中的 edge，同时写 `layout.json.edges[edgeId]`
- 新建 group：写 `.flow` 中的 group，同时写 `layout.json.groups[groupId]`
- 节点入组：写 `.flow` 中的 group 归属关系，必要时做少量布局修补

## 交互能力边界

### Phase 1 必做交互

#### 节点

- 可拖拽
- 可新建
- 可删除
- 可改标签
- 拖拽后位置持久化

#### 边

- 可新建
- 可删除
- 可改标签
- 节点四边都有 handle
- 连线时记录 `sourceSide / targetSide`
- 边侧信息持久化到 `layout.json`

#### group

- 可显示
- 可新建
- 可删除
- 可改标题
- 可拖拽
- 拖 group 时子节点整体平移
- 节点可拖入 group
- 入组判定采用较严格拖放规则，减少误触

#### 显式整理布局

- 提供“整理布局”按钮
- 仅在用户显式触发时运行
- 结果写回 `layout.json`

### Phase 1 明确不做

- 边完整路径持久化
- 手工调边折线拐点
- bezier 控制点编辑
- 吸附、对齐线、辅助线
- 高级局部布局助手
- 嵌套 group
- group 内独立坐标系
- 复杂 group 约束系统
- `viewport` 持久化
- ELK 切换

## Host 与 Webview 职责

### Host

Host 是真相协调者，负责：

- 读写 `.flow`
- 读写 `layout.json`
- Reconcile
- 将统一文档模型同步给 webview

### Webview

Webview 是交互层，负责：

- 渲染 graph + layout
- 接收拖拽、连线、建删改操作
- 将用户意图发给 host

Webview 可以持有临时 UI state，但不持有持久布局真相。

## 测试策略

Phase 1 需要将测试基线整体切换到双文件模型。

### 1. Parser / Serializer

- `edge id` 的解析与写回
- 旧 `.flow` 自动升级后的序列化结果
- group 语义写回

### 2. Layout File IO / Reconcile

- 无 sidecar 时自动生成
- 有 sidecar 时优先保留已有布局
- graph 变化后清理脏布局
- 缺失节点 / group / 边布局时自动补齐

### 3. Host Contract

- 拖节点写 `layout.json.nodes`
- 拖 group 时 group 与子节点整体平移写回
- 连线写 `layout.json.edges`
- 删除节点 / 边 / group 时同步清理布局
- 整理布局写回 sidecar，不洗 `.flow`

### 4. Webview Contract

- 四边 handle 暴露
- group 可交互
- 画布编辑消息按新协议发给 host
- syncState 后画布与持久布局一致

## 文档更新策略

Phase 1 完成后至少同步更新：

- `README.md`
- `SPEC.md`
- `docs/flow-syntax.md`

文档叙事要从“自动布局预览器”切换为：

**`.flow` 负责语义，`layout.json` 负责稳定空间编辑。**

## Phase 1 完成标准

Phase 1 完成后，产品应达到以下效果：

- 新打开的 `.flow` 可以自动生成初始布局
- 用户拖过的位置会被保存
- 再次打开文件时，优先还原用户整理后的图
- AI 或用户修改 `.flow` 语义后，老布局尽量保留
- 新节点会获得可接受的初始位置
- group 是正式布局对象，可增删改和拖拽
- 边侧信息可以通过 `edge id` 稳定持久化
- “整理布局”是显式工具，且结果写回 `layout.json`

最核心的结果是：

**用户手动排出来的图，系统不会再轻易把它弄丢。**
