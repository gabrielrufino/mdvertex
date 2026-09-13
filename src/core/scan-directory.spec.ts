import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { scanDirectory } from './scan-directory'

describe('scanDirectory', () => {
  const testDir = path.resolve(process.cwd(), 'temp-test-scan-dir')

  beforeAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
    fs.mkdirSync(testDir, { recursive: true })

    fs.writeFileSync(path.join(testDir, 'index.md'), 'Links to [guide](guide.md).')
    fs.writeFileSync(path.join(testDir, 'guide.md'), 'Links to [missing](missing.md).')
    fs.writeFileSync(path.join(testDir, 'orphan.md'), 'Nobody links to me, but I link to [guide](guide.md).')
    fs.writeFileSync(path.join(testDir, 'isolated.md'), 'Completely isolated note.')

    fs.mkdirSync(path.join(testDir, 'ignored-folder'), { recursive: true })
    fs.writeFileSync(path.join(testDir, 'ignored-folder', 'hidden.md'), 'Secret.')

    fs.mkdirSync(path.join(testDir, 'level1', 'level2'), { recursive: true })
    fs.writeFileSync(path.join(testDir, 'level1', 'level2', 'deep.md'), 'Deep note.')

    // Add .markdown extension file and non-markdown file
    fs.writeFileSync(path.join(testDir, 'link-to-extless-markdown.md'), 'Links to [extra](extra).')
    fs.writeFileSync(path.join(testDir, 'extra.markdown'), 'Markdown with .markdown extension. Links to [[guide]] and [[guide]] and [ext](https://example.com) and [node](node_modules/pkg.md).')
    fs.writeFileSync(path.join(testDir, 'image.png'), 'Not markdown.')

    // Default excludes folders
    for (const folder of ['node_modules', '.git', '.obsidian', 'dist', '.turbo', '.next']) {
      fs.mkdirSync(path.join(testDir, folder), { recursive: true })
      fs.writeFileSync(path.join(testDir, folder, 'excluded.md'), 'Excluded.')
    }
  })

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should scan all markdown files (.md and .markdown) and build complete vault graph', () => {
    const result = scanDirectory(testDir, { external: true })

    expect(result.isDirectory).toBe(true)
    expect(result.metrics.totalFiles).toBe(8)
    expect(result.graph.has(path.join(testDir, 'extra.markdown'))).toBe(true)
    expect(result.graph.has(path.join(testDir, 'image.png'))).toBe(false)

    // Verify extensionless link resolves to .markdown
    const linkNode = result.graph.get(path.join(testDir, 'link-to-extless-markdown.md'))
    expect(linkNode).toBeDefined()
    expect(linkNode?.references).toEqual([path.join(testDir, 'extra.markdown')])

    // Verify default excludes are omitted
    for (const folder of ['node_modules', '.git', '.obsidian', 'dist', '.turbo', '.next']) {
      expect(result.graph.has(path.join(testDir, folder, 'excluded.md'))).toBe(false)
    }

    // Verify resolving links without .md extension and deduplicating references
    const extraNode = result.graph.get(path.join(testDir, 'extra.markdown'))
    expect(extraNode).toBeDefined()
    expect(extraNode?.references).toEqual([path.join(testDir, 'guide.md')])
    // Node modules link was excluded
    expect(extraNode?.links.some(l => l.resolvedPath.includes('node_modules'))).toBe(false)

    // Missing referenced node added to graph
    expect(result.graph.has(path.join(testDir, 'missing.md'))).toBe(true)
    const missingNode = result.graph.get(path.join(testDir, 'missing.md'))
    expect(missingNode?.exists).toBe(false)
    expect(missingNode?.references).toEqual([])
    expect(missingNode?.links).toEqual([])

    expect(result.metrics.orphans).toContain(path.join(testDir, 'index.md'))
    expect(result.metrics.orphans).toContain(path.join(testDir, 'orphan.md'))
    expect(result.metrics.orphans).toContain(path.join(testDir, 'isolated.md'))
    expect(result.metrics.orphans).not.toContain(path.join(testDir, 'guide.md'))

    expect(result.metrics.isolated).toContain(path.join(testDir, 'isolated.md'))
    expect(result.metrics.brokenLinks).toHaveLength(1)
    expect(result.metrics.brokenLinks[0].target).toBe(path.join(testDir, 'missing.md'))
  })

  it('should gracefully handle non-existent directory in scan', () => {
    const result = scanDirectory('/non/existent/path/for/sure')
    expect(result.isDirectory).toBe(true)
    expect(result.graph.size).toBe(0)
  })

  it('should respect maxDepth option', () => {
    const result = scanDirectory(testDir, { maxDepth: 0 })
    expect(result.graph.has(path.join(testDir, 'index.md'))).toBe(true)
    expect(result.graph.has(path.join(testDir, 'level1', 'level2', 'deep.md'))).toBe(false)
  })

  it('should respect custom exclude patterns', () => {
    const result = scanDirectory(testDir, { exclude: ['ignored-folder'] })
    expect(result.graph.has(path.join(testDir, 'ignored-folder', 'hidden.md'))).toBe(false)
  })
})
