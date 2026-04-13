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
