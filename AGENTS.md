# Agent Guide - mdvertex

This guide contains crucial repository-specific details to help subsequent agents ramp up instantly and avoid common mistakes.

## 🛠️ Verification Commands
Always run verification in this specific order before finishing tasks:
1. **Lint/Format**: `npm run lint` (autofix via `npm run lint:fix`)
2. **Build**: `npm run build` (runs `tsc`)
3. **Test**: `npm run test` (runs `vitest run`)

## 🎨 Style & Toolchain Quirks
- **No Semicolons & Single Quotes**: Code style is strictly governed by `@antfu/eslint-config`. Avoid adding semicolons or double quotes manually; let `npm run lint:fix` handle standard formatting.
- **Node Globals**: The global `process` variable is forbidden by the linter. Always import it explicitly:
  ```typescript
  import process from 'node:process'
  ```
- **Regex and Loop Assignments**: Avoid the common `while ((match = regex.exec(content)) !== null)` pattern because `no-cond-assign` is active. Instead, use modern ES2020 `matchAll`:
  ```typescript
  for (const match of content.matchAll(regex)) {
    // ...
  }
  ```

## 🏗️ Architecture & CLI
- **CLI Entrypoint**: `src/cli.ts` utilizes `commander` directly at the top level and parses `process.argv` directly. Do not wrap the program parser in an unnecessary `run` function.
- **Binary**: The binary is mapped to `./dist/cli.js` under `"bin"` in `package.json`. Make sure to keep `chmod +x dist/cli.js` when compiling.
