import type { DependencyGraph } from '../types'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderMermaid } from './mermaid'

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
    expect(result).toContain('flowchart TD')
    expect(result).toContain('main.md')
    expect(result).toContain('about.md')
    expect(result).toContain('missing.md')
    expect(result).toContain('style node2 fill:#ffcccc,stroke:#ff0000,stroke-width:2px;')
  })
})
