import type { DependencyGraph, FileReference, MapDependenciesOptions } from '../types'
import fs from 'node:fs'
import path from 'node:path'
import { isExcluded } from './is-excluded'
import { parseLinks } from './parse-links'

const DEFAULT_EXCLUDES = ['node_modules', '.git', 'dist']

export function mapDependencies(
  entryPath: string,
  options: MapDependenciesOptions = {},
): DependencyGraph {
  const graph: DependencyGraph = new Map()
  let absoluteEntry = path.resolve(entryPath)
  if (!fs.existsSync(absoluteEntry)) {
    const fallback = [`${absoluteEntry}.md`, `${absoluteEntry}.markdown`]
      .find(candidate => fs.existsSync(candidate))
    if (fallback) {
      absoluteEntry = fallback
    }
  }

  const rootDir = options.vaultRoot ?? path.dirname(absoluteEntry)
  const excludes = options.exclude ? [...DEFAULT_EXCLUDES, ...options.exclude] : DEFAULT_EXCLUDES
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY

  function traverse(currentPath: string, currentDepth: number) {
    const isEntry = currentPath === absoluteEntry
    if (graph.has(currentPath) || currentDepth > maxDepth || (!isEntry && isExcluded(currentPath, rootDir, excludes))) {
      return
    }

    const exists = fs.existsSync(currentPath)
    const references: string[] = []
    const links: FileReference[] = []

    if (exists) {
      try {
        const content = fs.readFileSync(currentPath, 'utf8')
        const rawLinks = parseLinks(content, { external: options.external })
        const currentDir = path.dirname(currentPath)

        for (const link of rawLinks) {
          let resolvedPath = link.target
          if (!link.isExternal) {
            const resolved = path.resolve(currentDir, link.target)
            resolvedPath = resolved
            if (!fs.existsSync(resolved)) {
              const fallback = [`${resolved}.md`, `${resolved}.markdown`]
                .find(candidate => fs.existsSync(candidate))
              if (fallback) {
                resolvedPath = fallback
              }
            }
          }

          if (!isExcluded(resolvedPath, rootDir, excludes)) {
            links.push({
              ...link,
              resolvedPath,
            })
            if (!link.isExternal && !references.includes(resolvedPath)) {
              references.push(resolvedPath)
            }
          }
        }
      }
      catch {}
    }

    graph.set(currentPath, {
      filePath: currentPath,
      exists,
      references,
      links,
    })

    for (const ref of references) {
      traverse(ref, currentDepth + 1)
    }
  }

  traverse(absoluteEntry, 0)
  return graph
}
