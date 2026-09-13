import type { DependencyGraph, FileReference, ScanOptions, VaultScanResult } from '../types'
import fs from 'node:fs'
import path from 'node:path'
import { analyzeGraph } from './analyze-graph'
import { isExcluded } from './is-excluded'
import { parseLinks } from './parse-links'

const DEFAULT_EXCLUDES = ['node_modules', '.git', '.obsidian', 'dist', '.turbo', '.next']

export function scanDirectory(
  dirPath: string,
  options: ScanOptions = {},
): VaultScanResult {
  const absoluteDir = path.resolve(dirPath)
  const excludes = options.exclude ? [...DEFAULT_EXCLUDES, ...options.exclude] : DEFAULT_EXCLUDES
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY

  const graph: DependencyGraph = new Map()
  const vaultFiles = new Set<string>()

  function collectFiles(currentDir: string, currentDepth: number) {
    if (currentDepth > maxDepth || isExcluded(currentDir, absoluteDir, excludes)) {
      return
    }

    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true })
    }
    catch {
      return
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (isExcluded(fullPath, absoluteDir, excludes)) {
        continue
      }

      if (entry.isDirectory()) {
        collectFiles(fullPath, currentDepth + 1)
      }
      else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
        vaultFiles.add(fullPath)
      }
    }
  }

  collectFiles(absoluteDir, 0)

  for (const filePath of vaultFiles) {
    const references: string[] = []
    const links: FileReference[] = []

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const rawLinks = parseLinks(content, { external: options.external })
      const currentDir = path.dirname(filePath)

      for (const link of rawLinks) {
        let resolvedPath = link.target
        if (!link.isExternal) {
          const resolved = path.resolve(currentDir, link.target)
          resolvedPath = resolved
          if (!fs.existsSync(resolved)) {
            const withMd = `${resolved}.md`
            if (fs.existsSync(withMd)) {
              resolvedPath = withMd
            }
          }
        }

        if (!isExcluded(resolvedPath, absoluteDir, excludes)) {
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
    catch {
      // Ignore read errors
    }

    graph.set(filePath, {
      filePath,
      exists: true,
      references,
      links,
    })
  }

  for (const node of Array.from(graph.values())) {
    for (const ref of node.references) {
      if (!graph.has(ref)) {
        const exists = fs.existsSync(ref)
        graph.set(ref, {
          filePath: ref,
          exists,
          references: [],
          links: [],
        })
      }
    }
  }

  const metrics = analyzeGraph(graph, vaultFiles)

  return {
    rootPath: absoluteDir,
    isDirectory: true,
    graph,
    metrics,
  }
}
