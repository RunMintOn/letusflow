# Repository Guidelines

## Project Structure & Module Organization

This repository is a VS Code extension MVP for editing and previewing a custom `.flow` diagram DSL. Extension entry code lives in `src/extension.cjs`. Core diagram model operations are in `src/model/`, workspace file IO is in `src/workspace/`, and webview payload/rendering helpers are in `src/webview/`. The React webview app is under `src/webview-app/`, with components, actions, bridge code, mappings, and state split into matching subdirectories. Tests live in `test/*.test.js`. Project documentation and examples are in `docs/`, `example.flow`, `agent-loop.flow`, and `例图与对比/`. Built webview output is generated under `dist/` and should not be edited by hand.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run build`: bundle the webview through `esbuild.webview.mjs` into `dist/webview/`.
- `npm test`: run all Node test files with `node --test test/*.test.js`.
- VS Code debug: open this folder, choose `Run Diagram Editor MVP`, press `F5`, then run `Diagram Editor: Open Preview` in the Extension Host.

## Coding Style & Naming Conventions

Use ESM for `.js`/`.jsx` modules unless working in the CommonJS extension entry file. Match the existing style: two-space indentation, semicolon-free JavaScript, single quotes, trailing commas in multiline literals, and named exports for shared helpers. Keep React components in PascalCase, hooks as `useName`, and model/action helpers as verb-based camelCase, for example `createNode`, `renameEdgeLabel`, or `resetFlowLayout`.

## Testing Guidelines

Tests use Node's built-in `node:test` module with `node:assert/strict`. Add or update focused files in `test/` using the `*.test.js` naming pattern. Prefer unit coverage for parser/model changes, mapping tests for webview data transformations, and contract tests when host-webview messages change. Run `npm test` before handing off changes; run `npm run build` when modifying webview code or build configuration.

## Commit & Pull Request Guidelines

Recent commits use concise Conventional Commit-style prefixes such as `feat:`, `fix:`, `style:`, `docs:`, and `chore:`. Keep commits scoped and imperative, for example `fix: align handles with diagram direction`. Pull requests should include a short behavior summary, tests run, linked issues when applicable, and screenshots or screen recordings for visible webview changes.

## Agent-Specific Instructions

Do not overwrite user-edited `.flow` examples, docs, or generated layout files without checking the diff first. Treat `dist/` as generated output and rebuild it instead of editing bundled files directly.

用户补充:
- 在开始一次实际的代码修改之前,对此次改动复杂度进行评估,目的是为了更有效率的推进项目.
- 若低复杂度
	- 不走superpowers的spec--plan等流程
	- 我会手动切换到plan-only mode, 这是codex(你)自己的计划模式
	- 采用最小充分计划，避免过度流程化
	- 适配简单的改动
- 若中复杂度
	- 保留superpowers流程骨架，但允许裁剪
	- 可跳过 spec，直接写 plan；自行控制 plan 详略
	- 允许省略不影响质量的步骤，避免不必要的流程开销
	- 适配中等复杂度改动。
- 若高复杂度
	- 默认采用superpowers完整流程
	- 不为压缩流程而省略关键分析、设计、验证步骤
	- 适配高复杂度改动
- 你就简洁直接回答我你的判断
```
缺少相关信息可以使用deepwiki mcp获取