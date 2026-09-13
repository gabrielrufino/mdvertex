import type { DependencyGraph } from '../types'
import { describe, expect, it } from 'vitest'
import { analyzeGraph } from './analyze-graph'

describe('analyzeGraph', () => {
  it('should detect broken links with exact line and column', () => {
    const graph: DependencyGraph = new Map([
      [
        '/docs/intro.md',
        {
          filePath: '/docs/intro.md',
          exists: true,
          references: ['/docs/missing.md'],
          links: [
            {
              raw: 'missing.md',
              target: 'missing.md',
              resolvedPath: '/docs/missing.md',
              line: 4,
              column: 10,
            },
          ],
        },
      ],
      [
        '/docs/missing.md',
        {
          filePath: '/docs/missing.md',
          exists: false,
          references: [],
          links: [],
        },
      ],
    ])

    const metrics = analyzeGraph(graph)

    expect(metrics.totalFiles).toBe(1)
    expect(metrics.totalLinks).toBe(1)
    expect(metrics.brokenLinks).toHaveLength(1)
    expect(metrics.brokenLinks[0]).toEqual({
      source: '/docs/intro.md',
      target: '/docs/missing.md',
      raw: 'missing.md',
      line: 4,
      column: 10,
    })
  })

  it('should detect circular references with cycle details', () => {
    const graph: DependencyGraph = new Map([
      [
        '/docs/a.md',
        {
          filePath: '/docs/a.md',
          exists: true,
          references: ['/docs/b.md'],
          links: [{ raw: 'b.md', target: 'b.md', resolvedPath: '/docs/b.md', line: 2, column: 5 }],
        },
      ],
      [
        '/docs/b.md',
        {
          filePath: '/docs/b.md',
          exists: true,
          references: ['/docs/a.md'],
          links: [{ raw: 'a.md', target: 'a.md', resolvedPath: '/docs/a.md', line: 3, column: 8 }],
        },
      ],
    ])

    const metrics = analyzeGraph(graph)

    expect(metrics.circularReferences).toHaveLength(1)
    expect(metrics.circularReferences[0].cycle).toEqual(['/docs/a.md', '/docs/b.md', '/docs/a.md'])
  })

  it('should identify orphan and isolated nodes', () => {
    const graph: DependencyGraph = new Map([
      [
        '/docs/root.md',
        {
          filePath: '/docs/root.md',
          exists: true,
          references: ['/docs/child.md'],
          links: [{ raw: 'child.md', target: 'child.md', resolvedPath: '/docs/child.md', line: 1, column: 1 }],
        },
      ],
      [
        '/docs/child.md',
        {
          filePath: '/docs/child.md',
          exists: true,
          references: [],
          links: [],
        },
      ],
      [
        '/docs/orphan-with-refs.md',
        {
          filePath: '/docs/orphan-with-refs.md',
          exists: true,
          references: ['/docs/child.md'],
          links: [{ raw: 'child.md', target: 'child.md', resolvedPath: '/docs/child.md', line: 1, column: 1 }],
        },
      ],
      [
        '/docs/isolated.md',
        {
          filePath: '/docs/isolated.md',
          exists: true,
          references: [],
          links: [],
        },
      ],
    ])

    const vaultFiles = new Set(['/docs/root.md', '/docs/child.md', '/docs/orphan-with-refs.md', '/docs/isolated.md'])
    const metrics = analyzeGraph(graph, vaultFiles)

    expect(metrics.orphans).toContain('/docs/root.md')
    expect(metrics.orphans).toContain('/docs/orphan-with-refs.md')
    expect(metrics.orphans).toContain('/docs/isolated.md')
    expect(metrics.orphans).not.toContain('/docs/child.md')

    expect(metrics.isolated).toEqual(['/docs/isolated.md'])
  })

  it('should ignore external links and non-existing nodes in link processing and cycle detection', () => {
    const graph: DependencyGraph = new Map([
      [
        '/docs/ext.md',
        {
          filePath: '/docs/ext.md',
          exists: true,
          references: [],
          links: [
            {
              raw: 'https://example.com',
              target: 'https://example.com',
              resolvedPath: 'https://example.com',
              line: 1,
              column: 1,
              isExternal: true,
            },
          ],
        },
      ],
      [
        '/docs/non-existing.md',
        {
          filePath: '/docs/non-existing.md',
          exists: false,
          references: ['/docs/ext.md'],
          links: [
            {
              raw: 'ext.md',
              target: 'ext.md',
              resolvedPath: '/docs/ext.md',
              line: 1,
              column: 1,
            },
          ],
        },
      ],
    ])

    const metrics = analyzeGraph(graph)
    expect(metrics.totalFiles).toBe(1)
    expect(metrics.totalLinks).toBe(1)
    expect(metrics.brokenLinks).toEqual([])
    expect(metrics.circularReferences).toEqual([])
    expect(metrics.orphans).toEqual(['/docs/ext.md'])
  })

  it('should handle diamond dependencies without false circular references and test cycle sub-slice', () => {
    // Diamond: A -> B -> D, A -> C -> D
    // Sub-cycle: D -> E -> F -> E
    const graph: DependencyGraph = new Map([
      [
        '/docs/a.md',
        {
          filePath: '/docs/a.md',
          exists: true,
          references: ['/docs/b.md', '/docs/c.md'],
          links: [
            { raw: 'b.md', target: 'b.md', resolvedPath: '/docs/b.md', line: 1, column: 1 },
            { raw: 'c.md', target: 'c.md', resolvedPath: '/docs/c.md', line: 2, column: 1 },
          ],
        },
      ],
      [
        '/docs/b.md',
        {
          filePath: '/docs/b.md',
          exists: true,
          references: ['/docs/d.md'],
          links: [{ raw: 'd.md', target: 'd.md', resolvedPath: '/docs/d.md', line: 1, column: 1 }],
        },
      ],
      [
        '/docs/c.md',
        {
          filePath: '/docs/c.md',
          exists: true,
          references: ['/docs/d.md'],
          links: [{ raw: 'd.md', target: 'd.md', resolvedPath: '/docs/d.md', line: 1, column: 1 }],
        },
      ],
      [
        '/docs/d.md',
        {
          filePath: '/docs/d.md',
          exists: true,
          references: ['/docs/e.md'],
          links: [{ raw: 'e.md', target: 'e.md', resolvedPath: '/docs/e.md', line: 1, column: 1 }],
        },
      ],
      [
        '/docs/e.md',
        {
          filePath: '/docs/e.md',
          exists: true,
          references: ['/docs/f.md'],
          links: [{ raw: 'f.md', target: 'f.md', resolvedPath: '/docs/f.md', line: 1, column: 1 }],
        },
      ],
      [
        '/docs/f.md',
        {
          filePath: '/docs/f.md',
          exists: true,
          references: ['/docs/e.md'],
          links: [{ raw: 'e.md', target: 'e.md', resolvedPath: '/docs/e.md', line: 1, column: 1 }],
        },
      ],
    ])

    const metrics = analyzeGraph(graph)

    // Diamond path to D must not cause a cycle. The only cycle is E -> F -> E (starting at E, not A or D)
    expect(metrics.circularReferences).toHaveLength(1)
    expect(metrics.circularReferences[0].cycle).toEqual(['/docs/e.md', '/docs/f.md', '/docs/e.md'])
  })

  it('should handle graph without vaultFiles and empty orphans when all nodes have in-degree', () => {
    // Pure cycle A -> B -> A has no orphans
    const graph: DependencyGraph = new Map([
      [
        '/docs/a.md',
        {
          filePath: '/docs/a.md',
          exists: true,
          references: ['/docs/b.md'],
          links: [{ raw: 'b.md', target: 'b.md', resolvedPath: '/docs/b.md', line: 1, column: 1 }],
        },
      ],
      [
        '/docs/b.md',
        {
          filePath: '/docs/b.md',
          exists: true,
          references: ['/docs/a.md'],
          links: [{ raw: 'a.md', target: 'a.md', resolvedPath: '/docs/a.md', line: 1, column: 1 }],
        },
      ],
      [
        '/docs/missing.md',
        {
          filePath: '/docs/missing.md',
          exists: false,
          references: [],
        },
      ],
    ])

    const metrics = analyzeGraph(graph)
    expect(metrics.orphans).toEqual([])
    expect(metrics.isolated).toEqual([])
    expect(metrics.totalFiles).toBe(2)
  })

  it('should handle nodes with undefined links property and multiple in-degrees correctly', () => {
    const graph: DependencyGraph = new Map([
      [
        '/docs/a.md',
        {
          filePath: '/docs/a.md',
          exists: true,
          references: ['/docs/target.md'],
          links: [{ raw: 'target.md', target: 'target.md', resolvedPath: '/docs/target.md', line: 1, column: 1 }],
        },
      ],
      [
        '/docs/b.md',
        {
          filePath: '/docs/b.md',
          exists: true,
          references: ['/docs/target.md'],
          links: [{ raw: 'target.md', target: 'target.md', resolvedPath: '/docs/target.md', line: 1, column: 1 }],
        },
      ],
      [
        '/docs/target.md',
        {
          filePath: '/docs/target.md',
          exists: true,
          references: [],
          // links is intentionally undefined
        },
      ],
    ])

    const metrics = analyzeGraph(graph)
    expect(metrics.orphans).toEqual(['/docs/a.md', '/docs/b.md'])
    expect(metrics.isolated).toEqual([])
  })
})
