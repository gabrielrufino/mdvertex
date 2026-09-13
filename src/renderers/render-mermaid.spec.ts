import type { DependencyGraph } from '../types'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { renderMermaid } from './render-mermaid'

describe('renderMermaid', () => {
  it('should render correct Mermaid flowchart representation', () => {
    const entry = path.resolve('main.md')
    const about = path.resolve('about.md')
    const missing = path.resolve('missing.md')

    const graph: DependencyGraph = new Map([
      [
        entry,
        {
          filePath: entry,
          exists: true,
          references: [about, missing],
        },
      ],
      [
        about,
        {
          filePath: about,
          exists: true,
          references: [],
        },
      ],
      [
        missing,
        {
          filePath: missing,
          exists: false,
          references: [],
        },
      ],
    ])

    const result = renderMermaid(entry, graph)
    expect(result).toBe(
      'flowchart TD\n'
      + '    node0["main.md"]\n'
      + '    node1["about.md"]\n'
      + '    node2["missing.md"]\n'
      + '\n'
      + '    node0 --> node1\n'
      + '    node0 --> node2\n'
      + '\n'
      + '    style node0 fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px;\n'
      + '    style node2 fill:#ffcccc,stroke:#ff0000,stroke-width:2px;\n',
    )
  })

  it('should group nodes in subgraphs by directory', () => {
    const entry = path.resolve('main.md')
    const doc1 = path.resolve('docs/guide.md')
    const doc2 = path.resolve('docs/api.md')
    const comp1 = path.resolve('src/components/button.md')

    const graph: DependencyGraph = new Map([
      [
        entry,
        {
          filePath: entry,
          exists: true,
          references: [doc1, comp1],
        },
      ],
      [
        doc1,
        {
          filePath: doc1,
          exists: true,
          references: [doc2],
        },
      ],
      [
        doc2,
        {
          filePath: doc2,
          exists: true,
          references: [],
        },
      ],
      [
        comp1,
        {
          filePath: comp1,
          exists: true,
          references: [],
        },
      ],
    ])

    const result = renderMermaid(entry, graph)
    expect(result).toContain('subgraph subgraph_0 ["docs"]')
    expect(result).toContain('node1["docs/guide.md"]')
    expect(result).toContain('node2["docs/api.md"]')
    expect(result).toContain('subgraph subgraph_1 ["src/components"]')
    expect(result).toContain('node3["src/components/button.md"]')
    expect(result).toContain('end')
  })

  it('should handle Windows backslashes and empty dirname', () => {
    const fileA = path.resolve('win/sub/a.md')
    const fileB = path.resolve('root.md')

    const dirnameSpy = vi.spyOn(path, 'dirname').mockImplementation((p) => {
      if (p.includes('win')) {
        return 'win\\sub'
      }
      return ''
    })

    const graph: DependencyGraph = new Map([
      [
        fileA,
        {
          filePath: fileA,
          exists: true,
          references: [],
        },
      ],
      [
        fileB,
        {
          filePath: fileB,
          exists: true,
          references: [],
        },
      ],
    ])

    const result = renderMermaid(fileA, graph)
    dirnameSpy.mockRestore()

    expect(result).toContain('subgraph subgraph_0 ["win/sub"]')
    expect(result).not.toContain('subgraph subgraph_1 [""]')
    expect(result).toContain('node1["root.md"]')
  })
})
