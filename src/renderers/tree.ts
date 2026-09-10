import type { DependencyGraph } from '../types'
import path from 'node:path'
import { createHyperlink, getRelativePath } from './utils'

export function renderTree(entryPath: string, graph: DependencyGraph): string {
  const absoluteEntry = path.resolve(entryPath)
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
