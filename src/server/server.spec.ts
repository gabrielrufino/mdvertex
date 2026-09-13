import type http from 'node:http'
import type { DependencyGraph } from '../types'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import * as openTarget from './open-target'
import { createRequestHandler, startServer } from './server'

describe('createRequestHandler', () => {
  const entryPath = path.resolve('main.md')
  const targetPath = path.resolve('about.md')
  const missingPath = path.resolve('missing.md')
  const mockGraph: DependencyGraph = new Map([
    [
      entryPath,
      {
        filePath: entryPath,
        exists: true,
        references: [targetPath, missingPath],
      },
    ],
    [
      targetPath,
      {
        filePath: targetPath,
        exists: true,
        references: [],
      },
    ],
    [
      missingPath,
      {
        filePath: missingPath,
        exists: false,
        references: [],
      },
    ],
  ])

  function createMockResponse() {
    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: '',
      writeHead: vi.fn((code: number, headers: Record<string, string>) => {
        res.statusCode = code
        res.headers = headers
      }),
      end: vi.fn((chunk?: string) => {
        if (chunk) {
          res.body += chunk
        }
      }),
      write: vi.fn((chunk: string) => {
        res.body += chunk
      }),
    }) as unknown as http.ServerResponse & { statusCode: number, headers: Record<string, string>, body: string }
    return res
  }

  function createMockRequest(method = 'GET', url: string | undefined = '/', headers = {}) {
    return Object.assign(new EventEmitter(), {
      method,
      url,
      headers,
    }) as unknown as http.IncomingMessage
  }

  it('should return HTML on GET / and handle undefined req.url', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const req = createMockRequest('GET', undefined)
    const res = createMockResponse()

    handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8')
    expect(res.body).toContain('<!DOCTYPE html>')
  })

  it('should return JSON graph with complete node and link mappings on GET /api/graph', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const req = createMockRequest('GET', '/api/graph')
    const res = createMockResponse()

    handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8')
    const parsed = JSON.parse(res.body)
    expect(parsed.entry).toBe(entryPath)
    expect(parsed.relativeEntry).toBe('main.md')
    expect(parsed.mermaid).toContain('flowchart TD')
    expect(parsed.nodes).toHaveLength(3)
    expect(parsed.nodes[0]).toEqual({
      id: 'node0',
      filePath: entryPath,
      relativePath: 'main.md',
      exists: true,
      isEntry: true,
    })
    expect(parsed.nodes[1].isEntry).toBe(false)
    expect(parsed.nodeMap.node0).toEqual(parsed.nodes[0])
    expect(parsed.links).toEqual([
      { source: 'node0', target: 'node1' },
      { source: 'node0', target: 'node2' },
    ])
  })

  it('should register client and stream connected message on GET /events, and clean up on close', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const req = createMockRequest('GET', '/events')
    const res = createMockResponse()

    handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.headers).toEqual({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })
    expect(res.write).toHaveBeenCalledWith(': connected\n\n')
    expect(sseClients.has(res)).toBe(true)

    // Trigger close event on req
    req.emit('close')
    expect(sseClients.has(res)).toBe(false)
  })

  it('should handle POST /api/open with file query parameter', () => {
    const openEditorSpy = vi.spyOn(openTarget, 'openEditor').mockImplementation(() => {})
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const targetFile = path.resolve('about.md')
    const req = createMockRequest('POST', `/api/open?file=${encodeURIComponent(targetFile)}`)
    const res = createMockResponse()

    handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toBe('application/json')
    expect(openEditorSpy).toHaveBeenCalledWith(targetFile)
    const parsed = JSON.parse(res.body)
    expect(parsed.success).toBe(true)
    expect(parsed.file).toBe(targetFile)

    openEditorSpy.mockRestore()
  })

  it('should return 400 on POST /api/open when file param is missing', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const req = createMockRequest('POST', '/api/open')
    const res = createMockResponse()

    handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.headers['Content-Type']).toBe('application/json')
    const parsed = JSON.parse(res.body)
    expect(parsed.error).toContain('Missing "file"')
  })

  it('should return 403 on POST /api/open when file is not in dependency graph', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const unknownFile = path.resolve('not-in-graph.md')
    const req = createMockRequest('POST', `/api/open?file=${encodeURIComponent(unknownFile)}`)
    const res = createMockResponse()

    handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res.headers['Content-Type']).toBe('application/json')
    const parsed = JSON.parse(res.body)
    expect(parsed.error).toBe('File is not in the dependency graph')
  })

  it('should return 404 for unknown routes or wrong HTTP methods', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const req1 = createMockRequest('GET', '/unknown-route')
    const res1 = createMockResponse()
    handler(req1, res1)
    expect(res1.statusCode).toBe(404)
    expect(res1.headers['Content-Type']).toBe('text/plain')
    expect(res1.body).toBe('Not Found')

    const req2 = createMockRequest('POST', '/')
    const res2 = createMockResponse()
    handler(req2, res2)
    expect(res2.statusCode).toBe(404)

    const req3 = createMockRequest('GET', '/api/open')
    const res3 = createMockResponse()
    handler(req3, res3)
    expect(res3.statusCode).toBe(404)
  })

  it('should safely handle requests with malformed Host headers without throwing', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const req = createMockRequest('GET', '/', { host: 'invalid:host:[bad]' })
    const res = createMockResponse()

    expect(() => handler(req, res)).not.toThrow()
    expect(res.statusCode).toBe(200)
  })
})

describe('startServer options and lifecycle', () => {
  it('should open browser by default and support close method', async () => {
    const openBrowserSpy = vi.spyOn(openTarget, 'openBrowser').mockImplementation(() => {})

    const tempDir = path.resolve('temp-server-unit')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    const tempFile = path.join(tempDir, 'entry.md')
    fs.writeFileSync(tempFile, '# Entry', 'utf8')

    const instance = await startServer({
      entryPath: tempDir, // test directory mode
      open: true,
      port: 4800 + Math.floor(Math.random() * 200),
    })

    expect(instance.url).toContain('http://localhost:')
    expect(openBrowserSpy).toHaveBeenCalledWith(instance.url)

    await instance.close()
    openBrowserSpy.mockRestore()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should retry on next port when initial port encounters EADDRINUSE', async () => {
    const tempFile = path.resolve('temp-port-test.md')
    fs.writeFileSync(tempFile, '# Port test', 'utf8')

    const initialPort = 4900 + Math.floor(Math.random() * 50)
    // First start server on initialPort
    const instance1 = await startServer({
      entryPath: tempFile,
      open: false,
      port: initialPort,
    })

    expect(instance1.port).toBe(initialPort)

    // Now start second server requesting same initialPort -> should retry on initialPort + 1
    const instance2 = await startServer({
      entryPath: tempFile,
      open: false,
      port: initialPort,
    })

    expect(instance2.port).toBe(initialPort + 1)

    await instance1.close()
    await instance2.close()
    if (fs.existsSync(tempFile)) {
      fs.rmSync(tempFile, { force: true })
    }
  })
})
