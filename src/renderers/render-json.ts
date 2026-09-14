import type { DependencyGraph, GraphMetrics } from '../types'
import path from 'node:path'
import { analyzeGraph } from '../core/analyze-graph'
import { getRelativePath } from '../utils'

export function renderJson(entryPath: string, graph: DependencyGraph, customMetrics?: GraphMetrics): string {
  const absoluteEntry = path.resolve(entryPath)
  const relativeEntry = getRelativePath(absoluteEntry)
  const metrics = customMetrics ?? analyzeGraph(graph)

  const filesRecord: Record<string, { exists: boolean, references: string[] }> = {}

  for (const [absPath, node] of graph.entries()) {
    const relPath = getRelativePath(absPath)
    filesRecord[relPath] = {
      exists: node.exists,
      references: node.references.map(ref => getRelativePath(ref)),
    }
  }

  const outputPayload: Record<string, unknown> = {
    entry: relativeEntry,
    files: filesRecord,
    metrics: {
      totalFiles: metrics.totalFiles,
      totalLinks: metrics.totalLinks,
      brokenLinks: metrics.brokenLinks.map(b => ({
        source: getRelativePath(b.source),
        target: getRelativePath(b.target),
        raw: b.raw,
        line: b.line,
        column: b.column,
      })),
      circularReferences: metrics.circularReferences.map(c => ({
        cycle: c.cycle.map(p => getRelativePath(p)),
        line: c.line,
        column: c.column,
      })),
      orphans: metrics.orphans.map(o => getRelativePath(o)),
      isolated: metrics.isolated.map(i => getRelativePath(i)),
    },
  }

  return JSON.stringify(outputPayload, null, 2)
}
