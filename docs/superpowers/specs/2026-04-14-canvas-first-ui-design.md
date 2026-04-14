# Canvas First UI Design

## Goal

Reduce permanent chrome in the webview so the graph becomes the primary surface. Remove the current top toolbar and right inspector as fixed layout regions, then move editing and controls closer to the canvas and selected node.

## Decisions

### 1. Layout direction

Use a full-canvas layout as the default page structure.

- Remove the full-width top toolbar.
- Remove the fixed-width right inspector panel.
- Keep alerts or parse errors as lightweight overlays rather than structural regions where possible.

### 2. Node editing

Use direct-manipulation editing on the node.

- Double-click a node to enter edit mode.
- Replace the node label with an inline text input.
- `Enter` saves.
- `Escape` cancels.
- Blur may save if the draft is valid.

This is the primary replacement for the current inspector-driven rename flow.

### 3. Canvas controls

Split controls into two levels.

- Primary floating controls:
  - `整理布局`
  - `间距` slider
- Secondary display controls, hidden behind a lightweight floating menu:
  - background style
  - edge render mode

This keeps frequent actions visible while preventing a large permanent toolbar.

### 4. Visual language

Keep the current dark, diagram-focused tone, but make the shell quieter and lighter.

- Use translucent floating panels instead of solid bars.
- Keep the grid visible and atmospheric.
- Treat buttons as compact chips/capsules rather than full toolbar items.
- Make node editing feel immediate, not like switching into a separate settings area.

### 5. Interaction model

The graph remains the main surface at all times.

- Selection should not open a large side panel.
- Most metadata editing should happen inline or near the node.
- Temporary controls may float over the canvas but should not reserve layout width.

## Recommended first implementation slice

1. Remove structural toolbar and inspector layout regions.
2. Add floating `整理布局` button and floating `间距` slider.
3. Add a small `Display` floating menu for background and edge style.
4. Implement double-click inline node editing.
5. Keep edge label editing as a temporary fallback if needed, then revisit with a lighter inline treatment later.

## Risks and constraints

- Inline editing needs careful focus handling so it does not conflict with drag/select behavior.
- Floating controls must remain usable on smaller webview sizes.
- Parse errors and sync feedback still need a visible but non-intrusive presentation.

## Preview artifact

Static mockup: [ui-preview.html](/home/lee/11MyProjrct/31-agent-workflow/ui-preview.html)
