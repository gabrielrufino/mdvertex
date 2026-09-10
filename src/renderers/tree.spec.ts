import type { DependencyGraph } from '../types'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { renderTree } from './tree'

describe('renderTree', () => {
  it('should render correct tree representation of the graph', () => {
    const entry = path.resolve('main.md')
    const about = path.resolve('about.md')
    const contact = path.resolve('contact.md')

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
          references: [entry], // Circular!
        },
      ],
      [
        contact,
        {
          filePath: contact,
          exists: false, // Broken!
          references: [],
        },
      ],
    ])

    const result = renderTree(entry, graph)
    const entryUrl = pathToFileURL(entry).href
    const aboutUrl = pathToFileURL(about).href
    const contactUrl = pathToFileURL(contact).href

    expect(result).toContain(`📄 \u001B]8;;${entryUrl}\u001B\\main.md\u001B]8;;\u001B\\`)
    expect(result).toContain(`├── \u001B]8;;${aboutUrl}\u001B\\about.md\u001B]8;;\u001B\\`)
    expect(result).toContain(`│   └── \u001B]8;;${entryUrl}\u001B\\main.md\u001B]8;;\u001B\\ 🔄 [circular]`)
    expect(result).toContain(`└── \u001B]8;;${contactUrl}\u001B\\contact.md\u001B]8;;\u001B\\ ❌ [broken link]`)
  })

  it('should return an error string if entry file is not in the graph', () => {
    const entry = path.resolve('main.md')
    const graph: DependencyGraph = new Map()

    const result = renderTree(entry, graph)
    expect(result).toContain('❌ Entry file not found: main.md')
  })
})
