import type { DependencyGraph } from '../types'
import path from 'node:path'
import Handlebars from 'handlebars'
import templateSource from '../templates/html.hbs'
import { getRelativePath } from '../utils'
import { renderMermaid } from './render-mermaid'

const template = Handlebars.compile(templateSource)

export function renderHtml(entryPath: string, graph: DependencyGraph): string {
  const absoluteEntry = path.resolve(entryPath)
  const relativeEntry = getRelativePath(absoluteEntry)
  const mermaidCode = renderMermaid(absoluteEntry, graph)

  const idMap = new Map<string, string>()
  let idCounter = 0
  function getNodeId(filePath: string): string {
    if (!idMap.has(filePath)) {
      idMap.set(filePath, `node${idCounter++}`)
    }
    return idMap.get(filePath)!
  }

  const nodes = Array.from(graph.values()).map(node => ({
    id: getNodeId(node.filePath),
    filePath: node.filePath,
    relativePath: getRelativePath(node.filePath),
    exists: node.exists,
    isEntry: node.filePath === absoluteEntry,
  }))

  const nodeMap: Record<string, (typeof nodes)[0]> = {}
  for (const n of nodes) {
    nodeMap[n.id] = n
  }

  const links: Array<{ source: string, target: string }> = []
  for (const node of graph.values()) {
    const sourceId = getNodeId(node.filePath)
    for (const ref of node.references) {
      links.push({
        source: sourceId,
        target: getNodeId(ref),
      })
    }
  }

  const initialData = JSON.stringify({
    entry: absoluteEntry,
    relativeEntry,
    mermaid: mermaidCode,
    nodes,
    links,
    nodeMap,
  }).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')

  return template({
    absoluteEntry,
    relativeEntry,
    initialData,
  })
}
