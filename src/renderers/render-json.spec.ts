import type { DependencyGraph } from '../types'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderJson } from './render-json'

describe('renderJson', () => {
  it('should render correct JSON representation with relative paths and metrics', () => {
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
      [
        about,
        {
          filePath: about,
          exists: true,
          references: [],
        },
      ],
    ])

    const result = renderJson(entry, graph)
    const parsed = JSON.parse(result)

    expect(parsed.entry).toBe('main.md')
    expect(parsed.files['main.md']).toBeDefined()
    expect(parsed.files['main.md'].exists).toBe(true)
    expect(parsed.files['main.md'].references).toEqual(['about.md'])
    expect(parsed.metrics).toBeDefined()
    expect(parsed.metrics.totalFiles).toBe(2)
  })

  it('should format all metrics properly with relative paths', () => {
    const entry = path.resolve('main.md')
    const broken = path.resolve('broken.md')
    const circleA = path.resolve('circle-a.md')
    const circleB = path.resolve('circle-b.md')
    const orphan = path.resolve('orphan.md')
    const isolated = path.resolve('isolated.md')

    const graph: DependencyGraph = new Map()

    const customMetrics = {
      totalFiles: 6,
      totalLinks: 3,
      brokenLinks: [
        {
          source: entry,
          target: broken,
          raw: '[broken](./broken.md)',
          line: 10,
          column: 5,
        },
      ],
      circularReferences: [
        {
          cycle: [circleA, circleB, circleA],
          line: 12,
          column: 3,
        },
      ],
      orphans: [orphan],
      isolated: [isolated],
    }

    const result = renderJson(entry, graph, customMetrics)
    const parsed = JSON.parse(result)

    expect(parsed.metrics.brokenLinks).toEqual([
      {
        source: 'main.md',
        target: 'broken.md',
        raw: '[broken](./broken.md)',
        line: 10,
        column: 5,
      },
    ])
    expect(parsed.metrics.circularReferences).toEqual([
      {
        cycle: ['circle-a.md', 'circle-b.md', 'circle-a.md'],
        line: 12,
        column: 3,
      },
    ])
    expect(parsed.metrics.orphans).toEqual(['orphan.md'])
    expect(parsed.metrics.isolated).toEqual(['isolated.md'])
  })
})
