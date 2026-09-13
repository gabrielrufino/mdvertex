import type { DependencyGraph } from '../types'
import path from 'node:path'
import { getRelativePath } from '../utils'

export function renderMermaid(entryPath: string, graph: DependencyGraph): string {
  const absoluteEntry = path.resolve(entryPath)
  let output = 'flowchart TD\n'

  const idMap = new Map<string, string>()
  let idCounter = 0

  function getNodeId(filePath: string): string {
    if (!idMap.has(filePath)) {
      idMap.set(filePath, `node${idCounter++}`)
    }
    return idMap.get(filePath)!
  }

  const nodes = Array.from(graph.values())

  for (const node of nodes) {
    getNodeId(node.filePath)
  }

  const groups = new Map<string, typeof nodes>()
  for (const node of nodes) {
    const relPath = getRelativePath(node.filePath)
    const dir = path.dirname(relPath).replace(/\\/g, '/')
    if (!groups.has(dir)) {
      groups.set(dir, [])
    }
    groups.get(dir)!.push(node)
  }

  let subgraphCounter = 0
  for (const [dir, groupNodes] of groups.entries()) {
    if (dir === '.' || dir === '') {
      for (const node of groupNodes) {
        const id = getNodeId(node.filePath)
        const relPath = getRelativePath(node.filePath)
        output += `    ${id}["${relPath}"]\n`
      }
    }
    else {
      const subgraphId = `subgraph_${subgraphCounter++}`
      output += `    subgraph ${subgraphId} ["${dir}"]\n`
      for (const node of groupNodes) {
        const id = getNodeId(node.filePath)
        const relPath = getRelativePath(node.filePath)
        output += `        ${id}["${relPath}"]\n`
      }
      output += '    end\n'
    }
  }

  output += '\n'

  for (const node of nodes) {
    const sourceId = getNodeId(node.filePath)
    for (const ref of node.references) {
      const targetId = getNodeId(ref)
      output += `    ${sourceId} --> ${targetId}\n`
    }
  }

  output += '\n'

  for (const node of nodes) {
    if (!node.exists) {
      const id = getNodeId(node.filePath)
      output += `    style ${id} fill:#ffcccc,stroke:#ff0000,stroke-width:2px;\n`
    }
    else if (node.filePath === absoluteEntry) {
      const id = getNodeId(node.filePath)
      output += `    style ${id} fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px;\n`
    }
  }

  return output
}
