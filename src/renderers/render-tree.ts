import type { DependencyGraph } from '../types'
import fs from 'node:fs'
import path from 'node:path'
import { analyzeGraph } from '../core/analyze-graph'
import { createHyperlink, getRelativePath } from '../utils'

export function renderTree(entryPath: string, graph: DependencyGraph): string {
  const absoluteEntry = path.resolve(entryPath)
  const isDir = fs.existsSync(absoluteEntry) && fs.statSync(absoluteEntry).isDirectory()
  let output = ''

  function printNode(filePath: string, prefix: string, isLast: boolean, visited: Set<string>) {
    const relativePath = getRelativePath(filePath)
    const node = graph.get(filePath)

    const connector = isLast ? '└── ' : '├── '
    let status = ''

    if (!node) {
      status = ' [not parsed]'
    }
    else if (!node.exists) {
      status = ' ❌ [broken link]'
    }
    else if (visited.has(filePath)) {
      status = ' 🔄 [circular]'
    }

    const link = createHyperlink(relativePath, filePath)
    output += `${prefix}${connector}${link}${status}\n`

    if (!node || !node.exists || visited.has(filePath)) {
      return
    }

    const nextVisited = new Set(visited)
    nextVisited.add(filePath)

    const childPrefix = prefix + (isLast ? '    ' : '│   ')
    const refs = node.references

    for (let i = 0; i < refs.length; i++) {
      const isChildLast = i === refs.length - 1
      printNode(refs[i], childPrefix, isChildLast, nextVisited)
    }
  }

  if (isDir) {
    const metrics = analyzeGraph(graph)
    const relativeDir = getRelativePath(absoluteEntry) || '.'
    output += `📁 ${relativeDir}\n`

    const roots = metrics.orphans.length > 0
      ? metrics.orphans
      : Array.from(graph.keys()).filter(p => graph.get(p)?.exists)

    for (let i = 0; i < roots.length; i++) {
      const isRootLast = i === roots.length - 1
      const rootPath = roots[i]
      const rootNode = graph.get(rootPath)
      if (!rootNode) {
        continue
      }

      const rootRel = getRelativePath(rootPath)
      const rootLink = createHyperlink(rootRel, rootPath)
      const connector = isRootLast ? '└── ' : '├── '
      output += `${connector}📄 ${rootLink}\n`

      const visited = new Set<string>([rootPath])
      const childPrefix = isRootLast ? '    ' : '│   '
      for (let j = 0; j < rootNode.references.length; j++) {
        const isChildLast = j === rootNode.references.length - 1
        printNode(rootNode.references[j], childPrefix, isChildLast, visited)
      }
    }

    return output
  }

  const entryNode = graph.get(absoluteEntry)
  if (!entryNode) {
    return `❌ Entry file not found: ${getRelativePath(absoluteEntry)}\n`
  }

  const entryLink = createHyperlink(getRelativePath(absoluteEntry), absoluteEntry)
  output += `📄 ${entryLink}${entryNode.exists ? '' : ' ❌ [not found]'}\n`

  if (entryNode.exists) {
    const visited = new Set<string>([absoluteEntry])
    const refs = entryNode.references
    for (let i = 0; i < refs.length; i++) {
      const isLast = i === refs.length - 1
      printNode(refs[i], '', isLast, visited)
    }
  }

  return output
}
