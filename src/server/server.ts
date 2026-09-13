import type { DependencyGraph } from '../types'
import type { FileWatcher } from './watcher'
import http from 'node:http'
import path from 'node:path'
import { mapDependencies } from '../core'
import { renderHtml, renderMermaid } from '../renderers'
import { getRelativePath } from '../utils'
import { openBrowser, openEditor } from './open-target'
import { createFileWatcher } from './watcher'

export interface ServerOptions {
  entryPath: string
  port?: number
  open?: boolean
}

export interface ServerInstance {
  server: http.Server
  port: number
  url: string
  close: () => Promise<void>
}

function buildGraphPayload(entryPath: string, graph: DependencyGraph) {
  const absoluteEntry = path.resolve(entryPath)
  const relativeEntry = getRelativePath(absoluteEntry)
  const mermaid = renderMermaid(absoluteEntry, graph)

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

  return {
    entry: absoluteEntry,
    relativeEntry,
    mermaid,
    nodes,
    links,
    nodeMap,
  }
}

export function createRequestHandler(entryPath: string, getGraph: () => DependencyGraph, sseClients: Set<http.ServerResponse>) {
  const absoluteEntry = path.resolve(entryPath)

  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    const parsedUrl = new URL(req.url || '/', 'http://localhost')
    const pathname = parsedUrl.pathname

    if (req.method === 'GET' && pathname === '/') {
      const html = renderHtml(absoluteEntry, getGraph())
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }

    if (req.method === 'GET' && pathname === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      res.write(': connected\n\n')
      sseClients.add(res)

      req.on('close', () => {
        sseClients.delete(res)
      })
      return
    }

    if (req.method === 'GET' && pathname === '/api/graph') {
      const payload = buildGraphPayload(absoluteEntry, getGraph())
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(payload))
      return
    }

    if (req.method === 'POST' && pathname === '/api/open') {
      const targetFile = parsedUrl.searchParams.get('file')
      if (!targetFile) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing "file" query parameter' }))
        return
      }

      const graph = getGraph()
      if (!graph.has(targetFile)) {
        res.writeHead(403, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'File is not in the dependency graph' }))
        return
      }

      openEditor(targetFile)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, file: targetFile }))
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }
}

export async function startServer(options: ServerOptions): Promise<ServerInstance> {
  const absoluteEntry = path.resolve(options.entryPath)
  let currentGraph = mapDependencies(absoluteEntry)
  const sseClients = new Set<http.ServerResponse>()

  function broadcast(graph: DependencyGraph) {
    const payload = buildGraphPayload(absoluteEntry, graph)
    const data = `data: ${JSON.stringify(payload)}\n\n`
    for (const client of sseClients) {
      client.write(data)
    }
  }

  let watcher: FileWatcher | null = null

  const handler = createRequestHandler(absoluteEntry, () => currentGraph, sseClients)
  const server = http.createServer(handler)

  const initialPort = options.port ?? 3000

  const boundPort = await new Promise<number>((resolve, reject) => {
    let port = initialPort

    function tryListen() {
      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          port++
          server.close()
          tryListen()
        }
        else {
          reject(err)
        }
      })

      server.listen(port, '127.0.0.1', () => {
        resolve(port)
      })
    }

    tryListen()
  })

  watcher = createFileWatcher(absoluteEntry, currentGraph, (newGraph) => {
    currentGraph = newGraph
    broadcast(newGraph)
  })

  const url = `http://localhost:${boundPort}`

  if (options.open !== false) {
    openBrowser(url)
  }

  async function close() {
    watcher?.close()
    for (const client of sseClients) {
      client.end()
    }
    sseClients.clear()
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  }

  return {
    server,
    port: boundPort,
    url,
    close,
  }
}
