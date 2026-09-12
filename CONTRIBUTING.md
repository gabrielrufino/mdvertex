# Contributing to mdvertex

Thank you for your interest in contributing to `mdvertex`! Follow the guidelines below to set up your environment and contribute effectively.

---

## 🛠️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/gabrielrufino/mdvertex.git
cd mdvertex
```

### 2. Install dependencies

```bash
npm install
```

---

## 🧪 Development Workflow

### Linting & Formatting

Check for code style and linting issues:

```bash
npm run lint
```

Automatically fix linting and formatting issues:

```bash
npm run lint:fix
```

### Running Tests

Run the test suite with Vitest:

```bash
npm run test
```

Run tests with coverage report:

```bash
npm run test:cov
```

Run mutation testing with Stryker:

```bash
npm run test:mutation
```

### Building the Project

Compile the standalone bundle using `tsdown`:

```bash
npm run build
```

---

## 📝 Commit Conventions

This repository enforces the [Conventional Commits](https://www.conventionalcommits.org/) specification using `@commitlint`. Please ensure your commit messages follow the standard format:

- `feat: add support for obsidian callouts`
- `fix: resolve relative path resolution on windows`
- `docs: update installation instructions`
- `test: add unit tests for mermaid renderer`
