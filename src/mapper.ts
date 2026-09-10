import type { DependencyGraph } from './types'
import fs from 'node:fs'
import path from 'node:path'
import { extractLinks } from './parser'

export function mapDependencies(entryPath: string): DependencyGraph {
  const graph: DependencyGraph = new Map()
  const absoluteEntry = path.resolve(entryPath)

  function traverse(currentPath: string) {
    if (graph.has(currentPath)) {
      return
    }

    const exists = fs.existsSync(currentPath)
    let references: string[] = []

    if (exists) {
      try {
        const content = fs.readFileSync(currentPath, 'utf8')
        const rawLinks = extractLinks(content)
        const currentDir = path.dirname(currentPath)

        references = rawLinks.map(link => path.resolve(currentDir, link))
      }
      catch {}
    }

    graph.set(currentPath, {
      filePath: currentPath,
      exists,
      references,
    })

    for (const ref of references) {
      traverse(ref)
    }
  }

  traverse(absoluteEntry)
  return graph
}
