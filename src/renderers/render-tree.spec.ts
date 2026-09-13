import type { DependencyGraph } from '../types'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { renderTree } from './render-tree'

describe('renderTree', () => {
  it('should render correct tree representation of the graph', () => {
    const entry = path.resolve('main.md')
    const about = path.resolve('about.md')
    const contact = path.resolve('contact.md')
    const nested = path.resolve('nested.md')

    const graph: DependencyGraph = new Map([
      [
        entry,
        {
          filePath: entry,
          exists: true,
          references: [about, contact],
        },
      ],
      [
        about,
        {
          filePath: about,
          exists: true,
          references: [entry, nested], // Multiple descendants!
        },
      ],
      [
        contact,
        {
          filePath: contact,
          exists: true,
          references: [nested],
        },
      ],
      [
        nested,
        {
          filePath: nested,
          exists: true,
          references: [contact],
        },
      ],
    ])

    const result = renderTree(entry, graph)
    const entryUrl = pathToFileURL(entry).href
    const aboutUrl = pathToFileURL(about).href
    const contactUrl = pathToFileURL(contact).href
    const nestedUrl = pathToFileURL(nested).href

    const expected = `📄 \u001B]8;;${entryUrl}\u001B\\main.md\u001B]8;;\u001B\\\n`
      + `├── \u001B]8;;${aboutUrl}\u001B\\about.md\u001B]8;;\u001B\\\n`
      + `│   ├── \u001B]8;;${entryUrl}\u001B\\main.md\u001B]8;;\u001B\\ 🔄 [circular]\n`
      + `│   └── \u001B]8;;${nestedUrl}\u001B\\nested.md\u001B]8;;\u001B\\\n`
      + `│       └── \u001B]8;;${contactUrl}\u001B\\contact.md\u001B]8;;\u001B\\\n`
      + `│           └── \u001B]8;;${nestedUrl}\u001B\\nested.md\u001B]8;;\u001B\\ 🔄 [circular]\n`
      + `└── \u001B]8;;${contactUrl}\u001B\\contact.md\u001B]8;;\u001B\\\n`
      + `    └── \u001B]8;;${nestedUrl}\u001B\\nested.md\u001B]8;;\u001B\\\n`
      + `        └── \u001B]8;;${contactUrl}\u001B\\contact.md\u001B]8;;\u001B\\ 🔄 [circular]\n`
    expect(result).toBe(expected)
  })

  it('should render correct tree representation when entry file does not exist', () => {
    const entry = path.resolve('main.md')
    const about = path.resolve('about.md')
    const graph: DependencyGraph = new Map([
      [
        entry,
        {
          filePath: entry,
          exists: false,
          references: [about],
        },
      ],
    ])
    const result = renderTree(entry, graph)
    const entryUrl = pathToFileURL(entry).href
    expect(result).toBe(`📄 \u001B]8;;${entryUrl}\u001B\\main.md\u001B]8;;\u001B\\ ❌ [not found]\n`)
  })

  it('should render correct tree representation when a referenced node is missing from the graph', () => {
    const entry = path.resolve('main.md')
    const about = path.resolve('about.md')
    const graph: DependencyGraph = new Map([
      [
        entry,
        {
          filePath: entry,
          exists: true,
          references: [about],
        },
      ],
    ])
    const result = renderTree(entry, graph)
    const entryUrl = pathToFileURL(entry).href
    const aboutUrl = pathToFileURL(about).href
    const expected = `📄 \u001B]8;;${entryUrl}\u001B\\main.md\u001B]8;;\u001B\\\n`
      + `└── \u001B]8;;${aboutUrl}\u001B\\about.md\u001B]8;;\u001B\\ [not parsed]\n`
    expect(result).toBe(expected)
  })

  it('should return an error string if entry file is not in the graph', () => {
    const entry = path.resolve('main.md')
    const graph: DependencyGraph = new Map()

    const result = renderTree(entry, graph)
    expect(result).toContain('❌ Entry file not found: main.md')
  })

  it('should render directory trees when target is a directory', () => {
    const tempDir = path.resolve('temp-tree-dir')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const file1 = path.join(tempDir, 'a.md')
    const file2 = path.join(tempDir, 'b.md')

    const graph: DependencyGraph = new Map([
      [file1, { filePath: file1, exists: true, references: [file2] }],
      [file2, { filePath: file2, exists: true, references: [] }],
    ])

    const result = renderTree(tempDir, graph)
    expect(result).toContain('📁 temp-tree-dir')
    expect(result).toContain('temp-tree-dir/a.md')
    expect(result).toContain('temp-tree-dir/b.md')

    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should render directory trees with exact structure, multiple roots, and multiple children', () => {
    const tempDir = path.resolve('temp-tree-multi')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const root1 = path.join(tempDir, 'root1.md')
    const root2 = path.join(tempDir, 'root2.md')
    const child1 = path.join(tempDir, 'child1.md')
    const child2 = path.join(tempDir, 'child2.md')

    const graph: DependencyGraph = new Map([
      [
        root1,
        {
          filePath: root1,
          exists: true,
          references: [child1, child2],
          links: [
            { target: child1, resolvedPath: child1, raw: 'child1', line: 1, column: 1 },
            { target: child2, resolvedPath: child2, raw: 'child2', line: 2, column: 1 },
          ],
        },
      ],
      [
        root2,
        {
          filePath: root2,
          exists: true,
          references: [child1],
          links: [
            { target: child1, resolvedPath: child1, raw: 'child1', line: 1, column: 1 },
          ],
        },
      ],
      [child1, { filePath: child1, exists: true, references: [], links: [] }],
      [child2, { filePath: child2, exists: true, references: [], links: [] }],
    ])

    const result = renderTree(tempDir, graph)
    const root1Url = pathToFileURL(root1).href
    const root2Url = pathToFileURL(root2).href
    const child1Url = pathToFileURL(child1).href
    const child2Url = pathToFileURL(child2).href

    const expected = '📁 temp-tree-multi\n'
      + `├── 📄 \u001B]8;;${root1Url}\u001B\\temp-tree-multi/root1.md\u001B]8;;\u001B\\\n`
      + `│   ├── \u001B]8;;${child1Url}\u001B\\temp-tree-multi/child1.md\u001B]8;;\u001B\\\n`
      + `│   └── \u001B]8;;${child2Url}\u001B\\temp-tree-multi/child2.md\u001B]8;;\u001B\\\n`
      + `└── 📄 \u001B]8;;${root2Url}\u001B\\temp-tree-multi/root2.md\u001B]8;;\u001B\\\n`
      + `    └── \u001B]8;;${child1Url}\u001B\\temp-tree-multi/child1.md\u001B]8;;\u001B\\\n`

    expect(result).toBe(expected)

    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should fallback to all existing graph nodes when there are no orphan roots in directory', () => {
    const tempDir = path.resolve('temp-tree-cycle')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const fileA = path.join(tempDir, 'a.md')
    const fileB = path.join(tempDir, 'b.md')
    const missing = path.join(tempDir, 'missing.md')

    // Cycle A <-> B (0 orphans), plus missing node in graph (exists: false)
    const graph: DependencyGraph = new Map([
      [fileA, { filePath: fileA, exists: true, references: [fileB] }],
      [fileB, { filePath: fileB, exists: true, references: [fileA] }],
      [missing, { filePath: missing, exists: false, references: [] }],
    ])

    const result = renderTree(tempDir, graph)
    expect(result).toContain('📁 temp-tree-cycle')
    expect(result).toContain('temp-tree-cycle/a.md')
    expect(result).toContain('temp-tree-cycle/b.md')
    expect(result).not.toContain('missing.md')

    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should render . when directory is current working directory', () => {
    const cwd = process.cwd()
    const file1 = path.join(cwd, 'temp-cwd-test.md')
    const graph: DependencyGraph = new Map([
      [file1, { filePath: file1, exists: true, references: [] }],
    ])

    const result = renderTree('.', graph)
    expect(result.startsWith('📁 .\n')).toBe(true)
  })
})
