# mdvertex 📐

A powerful CLI and library to map, visualize, and audit references and links within Markdown files and directory vaults. It parses standard Markdown links and Wiki-links, resolves relative file paths, and renders the resulting dependency graph in multiple formats.

[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](https://unlicense.org/)

---

## Features

- 🌐 **Interactive Browser Live Preview (`browser` - Default)**:
  - Visualizes your dependency graph with Mermaid.js flowchart and D3 force-directed radial views.
  - **Live Reload**: Automatically monitors Markdown files and syncs updates in real time via Server-Sent Events (SSE) without page reloads.
  - **Instant Search & Filter**: Real-time search bar (shortcut `/`) to filter and highlight matching files across both views.
  - **Click-to-Open**: Click any node to open the file in VS Code or your default editor.
  - **Pan & Zoom**: Smooth navigation across large graphs with mouse drag and zoom controls.
  - **Theme Toggle**: Switch between dark and light themes.
- 📁 **Vault & Directory Scanning**: Scan entire folders (e.g. `mdvertex docs/` or `mdvertex .`) to map all Markdown notes, identify **orphan notes** (unreferenced files), and discover **isolated notes**.
- 🛡️ **CI / Audit Mode (`--check` / `--strict`)**:
  - Validates all internal links across documents.
  - Pinpoints exact line and column numbers of broken links (`docs/guide.md:14:5 -> missing.md`).
  - Detects circular dependency loops and returns exit code `1` on failure for CI/CD pipelines.
- 💾 **Static Export (`-o, --output`)**: Export standalone interactive HTML, Mermaid diagrams, ASCII trees, or JSON without launching a server.
- 🔍 **Multi-format Link Parsing**: Supports standard Markdown links `[label](path.md)` and Wiki-style links `[[WikiLink]]` (stripping anchors like `#section` and display names like `|label`).
- 📂 **Auto-Resolution & Subgraphs**: Seamlessly resolves links with or without `.md` and visually clusters notes into subgraphs by folder.
- 🎛️ **Filters & Traversal Limits**: Use `--max-depth <n>` and `--exclude <patterns...>` to ignore `node_modules`, drafts, or test directories.

---

## Prerequisites

`mdvertex` requires [Node.js](https://nodejs.org/) (version 18 or higher) installed on your machine.

---

## Installation

### Linux & macOS

Install using `curl`:

```bash
curl -fsSL https://raw.githubusercontent.com/gabrielrufino/mdvertex/main/scripts/install.sh | bash
```

### Windows

Install via PowerShell:

```powershell
irm https://raw.githubusercontent.com/gabrielrufino/mdvertex/main/scripts/install.ps1 | iex
```

---

## Update

### Linux & macOS

Update to the latest version using `curl`:

```bash
curl -fsSL https://raw.githubusercontent.com/gabrielrufino/mdvertex/main/scripts/update.sh | bash
```

### Windows

Update to the latest version via PowerShell:

```powershell
irm https://raw.githubusercontent.com/gabrielrufino/mdvertex/main/scripts/update.ps1 | iex
```

---

## Uninstall

### Linux & macOS

Uninstall mdvertex using `curl`:

```bash
curl -fsSL https://raw.githubusercontent.com/gabrielrufino/mdvertex/main/scripts/uninstall.sh | bash
```

### Windows

Uninstall via PowerShell:

```powershell
irm https://raw.githubusercontent.com/gabrielrufino/mdvertex/main/scripts/uninstall.ps1 | iex
```

---

## Usage

```bash
mdvertex <path> [options]
```

### Arguments

- `<path>`: Path to a Markdown entry file (e.g. `README.md`) or a directory / vault (e.g. `docs/` or `.`).

### Options

- `-f, --format <format>`: Output format. Supported formats: `browser`, `html`, `tree`, `json`, `mermaid` (default: `browser`).
- `-o, --output <file>`: Output file path to write rendered results directly.
- `-c, --check`: Run in audit / CI mode to check for broken links and cycles.
- `--strict`: Treat circular references as fatal errors in `--check` mode.
- `-d, --max-depth <number>`: Maximum traversal depth or directory scan recursion.
- `-e, --exclude <patterns...>`: Patterns or directory names to exclude (e.g. `node_modules`, `drafts`).
- `--external`: Include external URLs in parsing.
- `-p, --port <number>`: Server port for browser preview (default: `3000`).
- `--no-open`: Do not open the browser automatically.
- `-v, --version`: Output the version number.
- `-h, --help`: Display help for the command.

---

## Examples

### 1. Interactive Browser Live Preview (Default)

```bash
mdvertex docs/
```

- Opens `http://localhost:3000` with live SSE auto-reload on file edits.
- Press `/` to quickly search and filter notes.
- Click any node to open it in your editor.

### 2. CI / Audit Check Mode (`--check`)

```bash
mdvertex docs/ --check
```

Output:
```text
mdvertex check: Scanning references from docs...

Broken links (1):
  ❌ docs/intro.md:14:5 -> missing.md

Summary:
  Files checked:       12
  Total links checked: 34
  Broken links:        1
  Circular references: 0
  Orphan files:        2
  Isolated files:      1

Check failed: 1 broken links found.
```

### 3. Static HTML Export (`--output`)

```bash
mdvertex docs/ -o ./dist/graph.html
```

Generates a standalone, fully-functional HTML file that can be hosted on GitHub Pages or opened offline via `file://`.

### 4. Interactive Terminal Tree (`--format tree`)

```bash
mdvertex docs/intro.md --format tree
```

```text
📄 docs/intro.md
├── docs/getting-started.md
│   └── docs/installation.md
├── docs/advanced-topics.md
│   ├── docs/troubleshooting.md ❌ [broken link]
│   └── docs/intro.md 🔄 [circular]
└── docs/faq.md
```

### 5. Mermaid Flowchart Diagram (`--format mermaid`)

```bash
mdvertex docs/ --format mermaid
```

---

## Contributing

Contributions are always welcome! Please see the [Contributing Guide](CONTRIBUTING.md) for details on how to set up the development environment, run tests, and submit changes.

---

## License

This project is licensed under the Unlicense (see the [LICENSE](LICENSE) file for details).
