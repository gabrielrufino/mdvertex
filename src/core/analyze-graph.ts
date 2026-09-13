import type { BrokenLink, CircularReference, DependencyGraph, GraphMetrics } from '../types'

export function analyzeGraph(graph: DependencyGraph, vaultFiles?: Set<string>): GraphMetrics {
  const inDegrees = new Map<string, number>()
  const outDegrees = new Map<string, number>()
  const brokenLinks: BrokenLink[] = []
  let totalLinks = 0

  for (const filePath of graph.keys()) {
    inDegrees.set(filePath, 0)
    outDegrees.set(filePath, 0)
  }

  for (const [sourcePath, node] of graph.entries()) {
    if (!node.exists) {
      continue
    }

    const links = node.links ?? []
    totalLinks += links.length

    for (const link of links) {
      if (link.isExternal) {
        continue
      }

      inDegrees.set(link.resolvedPath, (inDegrees.get(link.resolvedPath) ?? 0) + 1)
      const targetNode = graph.get(link.resolvedPath)

      if (!targetNode || !targetNode.exists) {
        brokenLinks.push({
          source: sourcePath,
          target: link.resolvedPath,
          raw: link.raw,
          line: link.line,
          column: link.column,
        })
      }
    }

    outDegrees.set(sourcePath, node.references.length)
  }

  // Circular reference detection via DFS
  const circularReferences: CircularReference[] = []
  const visited = new Set<string>()
  const recStack = new Set<string>()
  const pathStack: string[] = []

  function detectCycles(current: string) {
    visited.add(current)
    recStack.add(current)
    pathStack.push(current)

    const node = graph.get(current)
    if (node && node.exists) {
      const links = node.links ?? []
      for (const link of links) {
        if (link.isExternal) {
          continue
        }
        const target = link.resolvedPath
        if (!visited.has(target)) {
          detectCycles(target)
        }
        else if (recStack.has(target)) {
          // Cycle found
          const cycleStartIndex = pathStack.indexOf(target)
          const cycle = [...pathStack.slice(cycleStartIndex), target]
          circularReferences.push({
            cycle,
            source: current,
            target,
            line: link.line,
            column: link.column,
          })
        }
      }
    }

    pathStack.pop()
    recStack.delete(current)
  }

  for (const filePath of graph.keys()) {
    if (!visited.has(filePath)) {
      detectCycles(filePath)
    }
  }

  const orphanNodes: string[] = []
  const isolatedNodes: string[] = []
  const candidates = vaultFiles ? Array.from(vaultFiles) : Array.from(graph.keys())

  let totalExistingFiles = 0
  for (const filePath of candidates) {
    const node = graph.get(filePath)
    if (!node || !node.exists) {
      continue
    }

    totalExistingFiles++
    const inDeg = inDegrees.get(filePath) ?? 0
    const outDeg = outDegrees.get(filePath) ?? 0

    if (inDeg === 0) {
      orphanNodes.push(filePath)
      if (outDeg === 0) {
        isolatedNodes.push(filePath)
      }
    }
  }

  return {
    totalFiles: totalExistingFiles,
    totalLinks,
    brokenLinks,
    circularReferences,
    orphans: orphanNodes,
    isolated: isolatedNodes,
  }
}
