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
})
