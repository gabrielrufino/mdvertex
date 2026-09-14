import type { DependencyGraph } from '../types'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderHtml } from './render-html'

describe('renderHtml', () => {
  it('should generate valid HTML document with embedded diagram data, radial network view and flowchart view', () => {
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

    const html = renderHtml(entry, graph)

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<title>mdvertex - main.md</title>')
    expect(html).toContain(`title="${entry}">main.md</div>`)
    expect(html).toContain('cdn.jsdelivr.net/npm/d3@7')
    expect(html).toContain('cdn.jsdelivr.net/npm/mermaid')
    expect(html).toContain('flowchart TD')
    expect(html).toContain('network-svg')
    expect(html).toContain('flowchart-view')
    expect(html).toContain('btn-layout')
    expect(html).toContain('btn-zoom-in')
    expect(html).toContain('btn-theme')
    expect(html).toContain('/events')
    expect(html).toContain('/api/open')
    expect(html).toContain('securityLevel: \'strict\'')
  })

  it('should escape HTML and script tags in paths to prevent XSS', () => {
    const maliciousPath = path.resolve('<script>alert("xss")</script>.md')
    const graph: DependencyGraph = new Map([
      [
        maliciousPath,
        {
          filePath: maliciousPath,
          exists: true,
          references: [],
        },
      ],
    ])

    const html = renderHtml(maliciousPath, graph)

    expect(html).not.toContain('<script>alert("xss")</script>.md</title>')
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;.md')
    // In JSON inside <script>, < and > must be escaped so closing tags cannot break out
    expect(html).not.toContain('</script><script>')
    expect(html).toContain('\\u003cscript\\u003e')
  })

  it('should embed structured graph data including nodes, links, and nodeMap', () => {
    const entry = path.resolve('main.md')
    const about = path.resolve('about.md')
    const missing = path.resolve('missing.md')

    const graph: DependencyGraph = new Map([
      [
        entry,
        {
          filePath: entry,
          exists: true,
          references: [about, missing, about],
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

    const html = renderHtml(entry, graph)

    // Extract initialData from the HTML template
    const match = html.match(/const state = \{\s*\.\.\.(\{[\s\S]*?\}),\s*layout:/)
    expect(match).toBeTruthy()

    const initialData = JSON.parse(match![1])

    expect(initialData.entry).toBe(entry)
    expect(initialData.relativeEntry).toBe('main.md')

    expect(initialData.nodes).toEqual([
      {
        id: 'node0',
        filePath: entry,
        relativePath: 'main.md',
        exists: true,
        isEntry: true,
      },
      {
        id: 'node1',
        filePath: about,
        relativePath: 'about.md',
        exists: true,
        isEntry: false,
      },
      {
        id: 'node2',
        filePath: missing,
        relativePath: 'missing.md',
        exists: false,
        isEntry: false,
      },
    ])

    expect(initialData.nodeMap).toEqual({
      node0: initialData.nodes[0],
      node1: initialData.nodes[1],
      node2: initialData.nodes[2],
    })

    expect(initialData.links).toEqual([
      { source: 'node0', target: 'node1' },
      { source: 'node0', target: 'node2' },
      { source: 'node0', target: 'node1' },
    ])
  })
})
