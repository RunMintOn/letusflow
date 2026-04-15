# .flow Technical Specification (v0.1)

This document defines the formal grammar, parsing logic, and synchronization behavior of the `.flow` domain-specific language (DSL).

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
- **Node**: `node <ID> <STRING> [in <ID>] [type=<ID>] [color=<COLOR>] [pos=<COORD>,<COORD>]`
- **Edge**: `edge <ID> -> <ID> [<STRING>] [dashed | dotted | dashdot]`
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
5. `pos=<x>,<y>` (optional)

### 3.2 Whitespace & Formatting
- Tokens SHOULD be separated by exactly one space.
- Leading/trailing whitespace on a line SHOULD be trimmed unless it was present in the original source (to preserve user indentation).

### 3.3 Comment Preservation
- The serializer SHOULD attempt to preserve comments. If a statement is modified via UI, the serializer MUST NOT delete comments that precede or follow that statement on separate lines.

---

## 4. Round-trip & Reconciliation (Bidirectional Sync)

This is the core behavior for editors implementing `.flow`.

### 4.1 Coordinate Management (`pos`)
- **Initialization**: If a `node` lacks a `pos` attribute, the editor MAY use an automatic layout engine (e.g., Dagre) to calculate positions.
- **Persistence**: If a user manually drags a node in the UI, the editor MUST update (or inject) the `pos=x,y` attribute in the source text.
- **Reset**: A "Reset Layout" action in the UI MUST remove all `pos` attributes from the source text to re-trigger automatic layout.

### 4.2 Element Renaming
- If a `node ID` is renamed via UI, the editor MUST update all corresponding `edge` statements (both `start` and `end` IDs) to maintain graph integrity.

### 4.3 Partial Updates
- When a user modifies a single property (e.g., changing a label), the editor SHOULD perform a **surgical update** on that specific line in the source text, rather than re-generating the entire file, to preserve comments and layout.

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
