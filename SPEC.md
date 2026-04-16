# .flow Technical Specification (v0.1)

This document defines the formal grammar, parsing logic, and synchronization behavior of the `.flow` DSL and its paired `layout.json` sidecar model.

---

## 1. Syntax & Grammar (EBNF-like)

A `.flow` file is a line-based text format. Each line is either a directive, a definition, a comment, or empty.

### 1.1 Core Tokens
- `ID`: `[a-zA-Z0-9_-]+`
- `STRING`: Any character sequence enclosed in double quotes (`"`), supporting backslash escapes (`\"`, `\\`).
- `COLOR`: `#[0-9a-fA-F]{3,6}` or standard CSS color names.
- `COORD`: Float value (e.g., `120.5`).

### 1.2 Statements
- **Direction**: `dir (LR | TD | TB)`
- **Group**: `group <ID> <STRING>`
- **Node**: `node <ID> <STRING> [in <ID>] [type=<ID>] [color=<COLOR>]`
- **Edge**: `edge <ID> -> <ID> [<STRING>] [dashed | dotted | dashdot] [id=<ID>]`
- **Comment**: Lines starting with `#` or `//`.

---

## 2. Parsing & State

### 2.1 Duplicate IDs
- If multiple `node` or `group` statements share the same `ID`, the **first occurrence** takes precedence. Subsequent declarations MUST be ignored by the parser but MAY be logged as warnings.

### 2.2 Default Values
- `dir`: Default is `LR`.
- `node type`: Default is `default`.
- `edge style`: Default is solid.

---

## 3. Serialization Rules (The "Source of Truth")

To ensure predictable diffs and maintain human-readability, the serializer MUST follow these rules when writing back to a `.flow` file:

### 3.1 Property Order
When serializing a `node`, attributes MUST follow this exact order:
1. `label` (quoted)
2. `in <groupID>` (optional)
3. `type=<type>` (optional)
4. `color=<color>` (optional, unified from `colour`)

When serializing an `edge`, attributes MUST follow this exact order:
1. `label` (quoted, optional)
2. `style` (optional)
3. `id=<edgeId>` (required after the first automatic upgrade)

### 3.2 Whitespace & Formatting
- Tokens SHOULD be separated by exactly one space.
- Leading/trailing whitespace on a line SHOULD be trimmed unless it was present in the original source (to preserve user indentation).

### 3.3 Comment Preservation
- The serializer SHOULD attempt to preserve comments. If a statement is modified via UI, the serializer MUST NOT delete comments that precede or follow that statement on separate lines.

---

## 4. Round-trip & Reconciliation (Bidirectional Sync)

This is the core behavior for editors implementing `.flow`.

### 4.1 Layout Sidecar Management
- `.flow` stores only graph semantics.
- `<name>.flow.layout.json` stores node, group, and edge-side layout data.
- By default, the editor SHOULD read both files and reconcile them before rendering.
- A "Reset Layout" or "Auto Layout" action MUST rewrite `layout.json`, not inject coordinates into `.flow`.

### 4.2 Element Renaming
- If a `node ID` is renamed via UI, the editor MUST update all corresponding `edge` statements (both `start` and `end` IDs) to maintain graph integrity.

### 4.3 Source Rewrites
- In Phase 1, the editor MAY rewrite the entire `.flow` file after semantic edits as long as the graph meaning remains correct.
- Layout changes MUST NOT rewrite `.flow`; they belong in `layout.json`.

---

## 5. Built-in Types

Editors SHOULD support the following node `type` presets:
- `default`: Rectangle.
- `decision`: Diamond.
- `start`: Rounded Rectangle.
- `end`: Capsule.
- `input`: Parallelogram.

---

## 6. Implementation Notes for AI

When generating `.flow` code, LLMs SHOULD:
1. Prefer explicit `node` declarations before `edge` definitions.
2. Always use double quotes for labels.
3. Use `dir TD` for vertical workflows.
