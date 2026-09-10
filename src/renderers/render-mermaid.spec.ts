import type { DependencyGraph } from '../types'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
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
      + '    style node2 fill:#ffcccc,stroke:#ff0000,stroke-width:2px;\n',
    )
  })
})
