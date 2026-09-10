import type { DependencyGraph } from '../types'
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
})
