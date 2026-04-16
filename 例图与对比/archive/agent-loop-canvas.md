```json
{
  "nodes": [
    {
      "id": "start",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 200,
      "height": 80,
      "text": "用户输入"
    },
    {
      "id": "build_ctx",
      "type": "text",
      "x": 250,
      "y": 0,
      "width": 200,
      "height": 80,
      "text": "构建上下文"
    },
    {
      "id": "call_llm",
      "type": "text",
      "x": 500,
      "y": 0,
      "width": 200,
      "height": 80,
      "text": "调用 LLM"
    },
    {
      "id": "decision",
      "type": "text",
      "x": 750,
      "y": 0,
      "width": 200,
      "height": 80,
      "text": "需要工具？"
    },
    {
      "id": "exec_tool",
      "type": "text",
      "x": 750,
      "y": 150,
      "width": 200,
      "height": 80,
      "text": "执行工具"
    },
    {
      "id": "append_result",
      "type": "text",
      "x": 750,
      "y": 300,
      "width": 200,
      "height": 80,
      "text": "追加结果"
    },
    {
      "id": "return_answer",
      "type": "text",
      "x": 1000,
      "y": 0,
      "width": 200,
      "height": 80,
      "text": "返回回答"
    },
    {
      "id": "end",
      "type": "text",
      "x": 1250,
      "y": 0,
      "width": 200,
      "height": 80,
      "text": "结束"
    }
  ],
  "edges": [
    {
      "fromNode": "start",
      "fromSide": "right",
      "toNode": "build_ctx",
      "toSide": "left"
    },
    {
      "fromNode": "build_ctx",
      "fromSide": "right",
      "toNode": "call_llm",
      "toSide": "left"
    },
    {
      "fromNode": "call_llm",
      "fromSide": "right",
      "toNode": "decision",
      "toSide": "left"
    },
    {
      "fromNode": "decision",
      "fromSide": "bottom",
      "toNode": "exec_tool",
      "toSide": "top"
    },
    {
      "fromNode": "exec_tool",
      "fromSide": "bottom",
      "toNode": "append_result",
      "toSide": "top"
    },
    {
      "fromNode": "append_result",
      "fromSide": "left",
      "toNode": "build_ctx",
      "toSide": "bottom"
    },
    {
      "fromNode": "decision",
      "fromSide": "right",
      "toNode": "return_answer",
      "toSide": "left"
    },
    {
      "fromNode": "return_answer",
      "fromSide": "right",
      "toNode": "end",
      "toSide": "left"
    }
  ]
}
```
