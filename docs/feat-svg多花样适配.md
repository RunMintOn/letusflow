
    1. SVG 支持什么 → 理论上都能用

    SVG 的 strokeDasharray 可以定义任意虚线模式：

     1 '4 4'       // 虚线
     2 '1 4'       // 点线
     3 '4 2 1 2'   // 点划线
     4 '8 4 2 4'   // 双短划线
     5 '10 3 3 3'  // 自定义任何图案

    SVG 本身不限制，你写什么它就画什么。

    2. xyflow 支不支持 → 都支持

    xyflow 的 edge.style 直接透传 SVG 属性，不会拦截任何值：

     1 flowEdge.style = { strokeDasharray: '1 4' }  // ✅ xyflow 直接传递给 SVG

    3. 你的 DSL 支不支持 → 这是真正的限制

    你的 .flow 语法目前只认 dashed 这一个关键字：

     1 edge A -> B dashed    ✅ 能解析
     2 edge A -> B dotted    ❌ Unknown line
     3 edge A -> B solid     ❌ Unknown line（虽然 solid 就是不设 strokeDasharray）

    所以真正的瓶颈不是 SVG，也不是 xyflow，而是你的解析器只识别 `dashed` 这一个关键字。

    ---

    总结

     1 SVG:        支持无限种虚线模式    ✅
     2 xyflow:     全部透传             ✅
     3 你的DSL:    只认 dashed 关键字   ← 这是唯一的限制

    想扩展什么样式完全由你决定，只需要改两处代码（解析器 + 渲染器）就行。