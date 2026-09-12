import type { DependencyGraph } from '../types'
import path from 'node:path'
import { getRelativePath } from '../utils'

export function renderJson(entryPath: string, graph: DependencyGraph): string {
  const absoluteEntry = path.resolve(entryPath)
  const relativeEntry = getRelativePath(absoluteEntry)

  const filesRecord: Record<string, { exists: boolean, references: string[] }> = {}

  for (const [absPath, node] of graph.entries()) {
    const relPath = getRelativePath(absPath)
    filesRecord[relPath] = {
      exists: node.exists,
      references: node.references.map(ref => getRelativePath(ref)),
    }
  }

  return JSON.stringify({ entry: relativeEntry, files: filesRecord }, null, 2)
}
