# mdvertex 📐

A powerful CLI and library to map, visualize, and audit references and links within Markdown files. It parses standard Markdown links and Wiki-links, resolves relative file paths, and renders the resulting dependency graph in multiple formats.

[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](https://unlicense.org/)

---

## Features

- 🔍 **Multi-format Link Parsing**: Supports standard Markdown links `[label](path.md)` and Wiki-style links `[[WikiLink]]` (stripping anchors like `#section` and display names like `|label`).
- 📂 **Auto-Resolution**: Seamlessly resolves links with or without the `.md` extension.
- 🌳 **Interactive Terminal Tree (`tree`)**:
  - Clickable ANSI terminal hyperlinks to open referenced files instantly.
  - Broken link detection (`❌ [broken link]`).
  - Circular dependency detection (`🔄 [circular]`).
- 📊 **Mermaid Diagrams (`mermaid`)**: Outputs standard `flowchart TD` code ready to be pasted in Mermaid live editors or rendered directly in GitHub.
- ⚙️ **Machine Readable (`json`)**: Generates structured JSON output showing the status and dependencies of all traversed files.

---

## Prerequisites

`mdvertex` requires [Node.js](https://nodejs.org/) (version 18 or higher) installed on your machine.

---

## Installation & Updates

### Linux & macOS

Install or update to the latest version using `curl`:

```bash
curl -fsSL https://raw.githubusercontent.com/gabrielrufino/mdvertex/main/install.sh | bash
```

### Windows

Install or update to the latest version via PowerShell:

```powershell
irm https://raw.githubusercontent.com/gabrielrufino/mdvertex/main/install.ps1 | iex
```

---

## Usage

```bash
mdvertex <entry-file> [options]
```

### Arguments

- `<entry-file>`: Path to the entry Markdown file (e.g., `README.md` or `index`).

### Options

- `-f, --format <format>`: Output format. Supported formats: `tree`, `json`, `mermaid` (default: `tree`).
- `-v, --version`: Output the version number.
- `-h, --help`: Display help for the command.

---

## Output Examples

### 1. Interactive Tree Format (`--format tree`)

Displays a hierarchical diagram of dependencies with ANSI hyperlinks (which can be clicked in modern terminals like VS Code, iTerm2, Alacritty, etc. to open the file directly).

```bash
$ mdvertex docs/intro.md --format tree
📄 docs/intro.md
├── docs/getting-started.md
│   └── docs/installation.md
├── docs/advanced-topics.md
│   ├── docs/troubleshooting.md ❌ [broken link]
│   └── docs/intro.md 🔄 [circular]
└── docs/faq.md
```

### 2. Mermaid Format (`--format mermaid`)

Generates a flowchart representing the references, visually highlighting the entry file and broken links.

```bash
$ mdvertex docs/intro.md --format mermaid
flowchart TD
    node0["docs/intro.md"]
    node1["docs/getting-started.md"]
    node2["docs/installation.md"]
    node3["docs/advanced-topics.md"]
    node4["docs/troubleshooting.md"]
    node5["docs/faq.md"]

    node0 --> node1
    node0 --> node3
    node0 --> node5
    node1 --> node2
    node3 --> node4
    node3 --> node0

    style node4 fill:#ffcccc,stroke:#ff0000,stroke-width:2px;
    style node0 fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px;
```

### 3. JSON Format (`--format json`)

Outputs a structured representation of the resolved dependency graph:

```bash
$ mdvertex docs/intro.md --format json
{
  "entry": "docs/intro.md",
  "files": {
    "docs/intro.md": {
      "exists": true,
      "references": [
        "docs/getting-started.md",
        "docs/advanced-topics.md",
        "docs/faq.md"
      ]
    },
    "docs/getting-started.md": {
      "exists": true,
      "references": [
        "docs/installation.md"
      ]
    },
    "docs/installation.md": {
      "exists": true,
      "references": []
    },
    "docs/advanced-topics.md": {
      "exists": true,
      "references": [
        "docs/troubleshooting.md",
        "docs/intro.md"
      ]
    },
    "docs/troubleshooting.md": {
      "exists": false,
      "references": []
    },
    "docs/faq.md": {
      "exists": true,
      "references": []
    }
  }
}
```

---

## Contributing

Contributions are always welcome! Please see the [Contributing Guide](CONTRIBUTING.md) for details on how to set up the development environment, run tests, and submit changes.

---

## License

This project is licensed under the Unlicense (see the [LICENSE](LICENSE) file for details).
