import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderJson, renderMermaid, renderTree } from '../renderers'
import { mapDependencies } from './map-dependencies'

describe('mapDependencies and renderers', () => {
  const testDir = path.resolve(process.cwd(), 'temp-test-env-specs')

  beforeAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
    fs.mkdirSync(testDir, { recursive: true })

    // Create test files
    fs.writeFileSync(
      path.join(testDir, 'main.md'),
      'Go to [about](about) and [[contact|Contact us]]. Also look at [missing](missing.md).',
    )
    fs.writeFileSync(
      path.join(testDir, 'about.md'),
      'Go back to [[main]]. Or check [[sub/nested]].',
    )
    fs.mkdirSync(path.join(testDir, 'sub'), { recursive: true })
    fs.writeFileSync(
      path.join(testDir, 'sub', 'nested.md'),
      'Empty nested file.',
    )
    fs.writeFileSync(
      path.join(testDir, 'contact.md'),
      'Contact page.',
    )
  })

  afterAll(() => {
    vi.restoreAllMocks()
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should recursively map dependencies including circular and broken links', () => {
    const readFileSyncSpy = vi.spyOn(fs, 'readFileSync')
    const entry = path.join(testDir, 'main.md')
    const graph = mapDependencies(entry)

    expect(graph.has(path.resolve(testDir, 'main.md'))).toBe(true)
    expect(graph.has(path.resolve(testDir, 'about.md'))).toBe(true)
    expect(graph.has(path.resolve(testDir, 'contact.md'))).toBe(true)
    expect(graph.has(path.resolve(testDir, 'sub/nested.md'))).toBe(true)
    expect(graph.has(path.resolve(testDir, 'missing.md'))).toBe(true)

    expect(graph.get(path.resolve(testDir, 'main.md'))?.exists).toBe(true)
    expect(graph.get(path.resolve(testDir, 'missing.md'))?.exists).toBe(false)
    expect(graph.get(path.resolve(testDir, 'missing.md'))?.references).toEqual([])
    expect(graph.get(path.resolve(testDir, 'main.md'))?.references).toEqual([
      path.resolve(testDir, 'about.md'),
      path.resolve(testDir, 'missing.md'),
      path.resolve(testDir, 'contact.md'),
    ])

    // Ensure fs.readFileSync is NOT called for the non-existing file (missing.md)
    const missingPath = path.resolve(testDir, 'missing.md')
    const calledWithMissing = readFileSyncSpy.mock.calls.some(call => path.resolve(call[0] as string) === missingPath)
    expect(calledWithMissing).toBe(false)
  })

  it('should render correct Tree output', () => {
    const entry = path.join(testDir, 'main.md')
    const graph = mapDependencies(entry)
    const treeOutput = renderTree(entry, graph)

    const mainUrl = pathToFileURL(path.resolve(testDir, 'main.md')).href
    const aboutUrl = pathToFileURL(path.resolve(testDir, 'about.md')).href
    const missingUrl = pathToFileURL(path.resolve(testDir, 'missing.md')).href

    expect(treeOutput).toContain(`\u001B]8;;${mainUrl}\u001B\\temp-test-env-specs/main.md\u001B]8;;\u001B\\`)
    expect(treeOutput).toContain(`\u001B]8;;${aboutUrl}\u001B\\temp-test-env-specs/about.md\u001B]8;;\u001B\\`)
    expect(treeOutput).toContain(`\u001B]8;;${missingUrl}\u001B\\temp-test-env-specs/missing.md\u001B]8;;\u001B\\ ❌ [broken link]`)
    expect(treeOutput).toContain(`\u001B]8;;${mainUrl}\u001B\\temp-test-env-specs/main.md\u001B]8;;\u001B\\ 🔄 [circular]`)
  })

  it('should render correct JSON output', () => {
    const entry = path.join(testDir, 'main.md')
    const graph = mapDependencies(entry)
    const jsonOutput = renderJson(entry, graph)
    const parsed = JSON.parse(jsonOutput)

    expect(parsed.entry).toContain('temp-test-env-specs/main.md')
    expect(parsed.files['temp-test-env-specs/main.md'].exists).toBe(true)
    expect(parsed.files['temp-test-env-specs/missing.md'].exists).toBe(false)
  })

  it('should render correct Mermaid output', () => {
    const entry = path.join(testDir, 'main.md')
    const graph = mapDependencies(entry)
    const mermaidOutput = renderMermaid(entry, graph)

    expect(mermaidOutput).toContain('flowchart TD')
    expect(mermaidOutput).toContain('temp-test-env-specs/main.md')
    expect(mermaidOutput).toContain('fill:#ffcccc,stroke:#ff0000,stroke-width:2px')
  })

  it('should resolve entry path and links without .md extension', () => {
    const entry = path.join(testDir, 'main')
    const graph = mapDependencies(entry)

    expect(graph.has(path.resolve(testDir, 'main.md'))).toBe(true)
    expect(graph.has(path.resolve(testDir, 'about.md'))).toBe(true)
    expect(graph.get(path.resolve(testDir, 'main.md'))?.exists).toBe(true)
  })

  it('should handle non-existent entry without .md fallback', () => {
    const entry = path.join(testDir, 'completely-unknown-file')
    const graph = mapDependencies(entry)

    const resolved = path.resolve(entry)
    expect(graph.has(resolved)).toBe(true)
    expect(graph.get(resolved)?.exists).toBe(false)
  })

  it('should respect maxDepth option', () => {
    // main (depth 0) -> about (depth 1) -> sub/nested (depth 2)
    const entry = path.join(testDir, 'main.md')

    const graphDepth0 = mapDependencies(entry, { maxDepth: 0 })
    expect(graphDepth0.has(path.resolve(testDir, 'main.md'))).toBe(true)
    expect(graphDepth0.has(path.resolve(testDir, 'about.md'))).toBe(false)

    const graphDepth1 = mapDependencies(entry, { maxDepth: 1 })
    expect(graphDepth1.has(path.resolve(testDir, 'main.md'))).toBe(true)
    expect(graphDepth1.has(path.resolve(testDir, 'about.md'))).toBe(true)
    expect(graphDepth1.has(path.resolve(testDir, 'sub/nested.md'))).toBe(false)
  })

  it('should respect default and custom excludes', () => {
    const fileWithExcludes = path.join(testDir, 'excludes-test.md')
    fs.writeFileSync(
      fileWithExcludes,
      'Links: [mod](node_modules/pkg.md), [git](.git/info.md), [dist](dist/bundle.md), [custom](ignored/file.md), [valid](contact.md).',
    )

    const graph = mapDependencies(fileWithExcludes, { exclude: ['ignored'] })
    const node = graph.get(path.resolve(fileWithExcludes))

    expect(node).toBeDefined()
    expect(node?.references).toEqual([path.resolve(testDir, 'contact.md')])
    // None of node_modules, .git, dist, or ignored are in links
    expect(node?.links.some(l => l.resolvedPath.includes('node_modules'))).toBe(false)
    expect(node?.links.some(l => l.resolvedPath.includes('.git'))).toBe(false)
    expect(node?.links.some(l => l.resolvedPath.includes('dist'))).toBe(false)
    expect(node?.links.some(l => l.resolvedPath.includes('ignored'))).toBe(false)
  })

  it('should handle external links and avoid duplicate references', () => {
    const fileWithExt = path.join(testDir, 'ext-test.md')
    fs.writeFileSync(
      fileWithExt,
      'Links: [about1](about.md), [about2](about.md), [google](https://google.com).',
    )

    const graph = mapDependencies(fileWithExt, { external: true })
    const node = graph.get(path.resolve(fileWithExt))

    expect(node).toBeDefined()
    // References contains about.md exactly once and does not contain external URL
    expect(node?.references).toEqual([path.resolve(testDir, 'about.md')])
    // Links contains both about.md links and the external link
    expect(node?.links).toHaveLength(3)
    const extLink = node?.links.find(l => l.isExternal)
    expect(extLink).toBeDefined()
    expect(extLink?.resolvedPath).toBe('https://google.com')
  })
})
