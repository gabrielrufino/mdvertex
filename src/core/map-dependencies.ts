import type { DependencyGraph } from '../types'
import fs from 'node:fs'
import path from 'node:path'
import { parseLinks } from './parse-links'

export function mapDependencies(entryPath: string): DependencyGraph {
  const graph: DependencyGraph = new Map()
  let absoluteEntry = path.resolve(entryPath)
  if (!fs.existsSync(absoluteEntry)) {
    const withMd = `${absoluteEntry}.md`
    if (fs.existsSync(withMd)) {
      absoluteEntry = withMd
    }
  }

  function traverse(currentPath: string) {
    if (graph.has(currentPath)) {
      return
    }

    const exists = fs.existsSync(currentPath)
    let references: string[] = []

    if (exists) {
      try {
        const content = fs.readFileSync(currentPath, 'utf8')
        const rawLinks = parseLinks(content)
        const currentDir = path.dirname(currentPath)

        references = rawLinks.map((link) => {
          const resolved = path.resolve(currentDir, link)
          if (!fs.existsSync(resolved)) {
            const withMd = `${resolved}.md`
            if (fs.existsSync(withMd)) {
              return withMd
            }
          }
          return resolved
        })
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
