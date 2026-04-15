# Mermaid-Like Readability Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve diagram readability quickly by making edges read more like Mermaid and increasing visual weight without changing the core host/webview sync model.

**Architecture:** Keep the existing Dagre-based layout and XYFlow renderer. In this phase, only adjust the edge rendering path, edge/node visual weight, and lightweight label placement so the diagrams are easier to scan before touching deeper layout semantics.

**Tech Stack:** VS Code webview, React, `@xyflow/react`, existing Node test runner

---

### Task 1: Lock in the Phase 1 behavior

**Files:**
- Modify: `test/normal-read-edge-path.test.js`
- Modify: `test/normal-read-edge-component-contract.test.js`
- Create or Modify: `test/phase-1-readability-contract.test.js`

- [ ] **Step 1: Write failing tests for curved edge geometry**
- [ ] **Step 2: Run the focused tests and verify they fail for the expected reason**
- [ ] **Step 3: Add failing contract tests for stronger edge and node text weight**
- [ ] **Step 4: Run the focused tests and verify they fail for the expected reason**

### Task 2: Implement the minimal rendering changes

**Files:**
- Modify: `src/webview-app/components/edges/normalReadEdgePath.js`
- Modify: `src/webview-app/components/edges/NormalReadEdge.jsx`
- Modify: `src/webview-app/mapping/toFlowEdges.js`
- Modify: `src/webview-app/index.css`

- [ ] **Step 1: Replace the straight edge path with a smooth path while keeping decision-node clipping**
- [ ] **Step 2: Strengthen edge stroke and label weight**
- [ ] **Step 3: Increase node label size slightly for readability**
- [ ] **Step 4: Add lightweight label Y-offset logic so labels are less likely to sit on top of nearby nodes**

### Task 3: Verify the first-phase gain

**Files:**
- Test: `test/normal-read-edge-path.test.js`
- Test: `test/normal-read-edge-component-contract.test.js`
- Test: `test/phase-1-readability-contract.test.js`

- [ ] **Step 1: Run the focused tests and make sure they pass**
- [ ] **Step 2: Run the full relevant test subset for edge rendering and styling contracts**
- [ ] **Step 3: Summarize what improved and what Phase 2 still needs**
