import type { DependencyGraph } from '../types'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderJson } from './json'

describe('renderJson', () => {
  it('should render correct JSON representation with relative paths', () => {
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
  })
})
