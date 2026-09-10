import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mapDependencies } from './mapper'
import { extractLinks } from './parser'
import { renderJson, renderMermaid, renderTree } from './renderers'

describe('mdvertex', () => {
  describe('extractLinks', () => {
    it('should extract standard markdown links and ignore external links', () => {
      const content = `
        This is a [link](about.md).
        This is another [link with hash](contact.md#section?query=1).
        This is an [external link](https://google.com).
      `
      const result = extractLinks(content)
      expect(result).toEqual(['about.md', 'contact.md'])
    })

    it('should extract wiki links and handle aliases/hashes', () => {
      const content = `
        Check [[about]].
        Check [[contact|Contact Us]].
        Check [[privacy#section]].
        Check [[policy#section|Our Policy]].
        Check [[external https://google.com]] (ignored or extracted if needed, but handled safely)
      `
      const result = extractLinks(content)
      expect(result).toEqual(['about.md', 'contact.md', 'privacy.md', 'policy.md', 'external https://google.com.md'])
    })
  })

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
        'Go to [about](about.md) and [[contact|Contact us]]. Also look at [missing](missing.md).',
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
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true })
      }
    })

    it('should recursively map dependencies including circular and broken links', () => {
      const entry = path.join(testDir, 'main.md')
      const graph = mapDependencies(entry)

      expect(graph.has(path.resolve(testDir, 'main.md'))).toBe(true)
      expect(graph.has(path.resolve(testDir, 'about.md'))).toBe(true)
      expect(graph.has(path.resolve(testDir, 'contact.md'))).toBe(true)
      expect(graph.has(path.resolve(testDir, 'sub/nested.md'))).toBe(true)
      expect(graph.has(path.resolve(testDir, 'missing.md'))).toBe(true)

      expect(graph.get(path.resolve(testDir, 'main.md'))?.exists).toBe(true)
      expect(graph.get(path.resolve(testDir, 'missing.md'))?.exists).toBe(false)
      expect(graph.get(path.resolve(testDir, 'main.md'))?.references).toContain(path.resolve(testDir, 'about.md'))
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
  })
})
