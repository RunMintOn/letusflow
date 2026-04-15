▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
✦ 你的观察非常敏锐！这涉及到一个非常经典的技术细节，即 “多重边”（Multiple Edges）
  在不同绘图引擎中的处理方式。

  你说的情况（.flow 只显示了一个 task_mode）通常由以下两个原因之一造成：

  1. 标签重叠 (Label Overlapping)
  在很多基础的绘图引擎（比如早期的 Graphviz 或某些自定义的 D3 布局）中，如果你定义了从 A 到 B
  的多条连线：
   1 edge A -> B "第一条"
   2 edge A -> B "第二条"
   3 edge A -> B "第三条"
  引擎可能会把这三条线完全重叠地画在一起。因为起点和终点完全一样，如果不做特殊的“贝塞尔曲线偏移
  ”处理，它们就会看起来像是一条线。而标签（Label）也会重叠在一起，通常最后定义的那个标签会盖在
  最上面，所以你只看到了 task_mode。

  2. 节点对唯一性校验 (Deduplication)
  有些简洁的 DSL（比如你正在使用的这个 .flow 解释器）在解析时可能做了“去重”处理。它认为从
  control 到 stageTwo 只需要一条物理连线，因此在解析时只保留了最后一条定义的 edge 信息。

  ---

  对比 Mermaid 和 D2：

   * Mermaid：它的布局引擎（Dagre）比较聪明，当它发现有多条线时，会自动给每一条线计算不同的弧度
     ，让它们分开显示。
   * D2：这是 D2 的强项。D2 的布局引擎（尤其是
     Tala）会非常优雅地处理多条并行线，甚至能让你在代码里通过 connection_1, connection_2
     来分别控制它们。

  解决方案建议：

  如果你希望在 .flow 中看到所有逻辑分支，但受限于引擎无法显示多条线，通常有以下几种变通写法：

  方案 A：合并标签（最简单）
  将三个动作写在一个标签里，用逗号或换行符分开。

   1 edge control -> stageTwo "execute / clarify / task_mode"

  方案 B：增加中间代理节点（最清晰）
  如果你想体现“决策”的过程，可以在中间加一个小节点。

   1 node action_type "Choose Action" type=decision
   2 edge control -> action_type
   3 edge action_type -> stageTwo "execute"
   4 edge action_type -> stageTwo "clarify"
   5 edge action_type -> stageTwo "task_mode"
  这样连线就不再是“并行”的，而是从 action_type 发散出去的，任何引擎都能完美渲染。

  总结：
  这确实是 .flow 这种轻量级（或者说尚不完善）DSL 的一个局限性。它更倾向于一对一的物理连接，而
  Mermaid 和 D2 是更成熟、支持多重图 (Multigraph) 的绘图引擎。