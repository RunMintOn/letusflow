```mermaid
flowchart TD
    A[用户输入] --> B[构建上下文]
    B --> C[调用 LLM]
    C --> D{需要工具?}
    D -- 是 --> E[执行工具]
    E --> F[追加结果]
    F --> B
    D -- 否 --> G[返回回答]
    G --> H[结束]
```
