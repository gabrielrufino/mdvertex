import type http from 'node:http'
import type { DependencyGraph } from '../types'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import * as openTarget from './open-target'
import { createRequestHandler } from './server'

describe('createRequestHandler', () => {
  const entryPath = path.resolve('main.md')
  const targetPath = path.resolve('about.md')
  const mockGraph: DependencyGraph = new Map([
    [
      entryPath,
      {
        filePath: entryPath,
        exists: true,
        references: [],
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
  ])

  function createMockResponse() {
    const res = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: '',
      writeHead: vi.fn((code: number, headers: Record<string, string>) => {
        res.statusCode = code
        res.headers = headers
      }),
      end: vi.fn((chunk: string) => {
        res.body = chunk
      }),
      write: vi.fn((chunk: string) => {
        res.body += chunk
      }),
    } as unknown as http.ServerResponse & { statusCode: number, headers: Record<string, string>, body: string }
    return res
  }

  it('should return HTML on GET /', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const req = { method: 'GET', url: '/', headers: {} } as http.IncomingMessage
    const res = createMockResponse()

    handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toContain('text/html')
    expect(res.body).toContain('<!DOCTYPE html>')
  })

  it('should return JSON graph on GET /api/graph', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const req = { method: 'GET', url: '/api/graph', headers: {} } as http.IncomingMessage
    const res = createMockResponse()

    handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toContain('application/json')
    const parsed = JSON.parse(res.body)
    expect(parsed.entry).toBe(entryPath)
    expect(parsed.mermaid).toContain('flowchart TD')
  })

  it('should handle POST /api/open with file query parameter', () => {
    const openEditorSpy = vi.spyOn(openTarget, 'openEditor').mockImplementation(() => {})
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const targetFile = path.resolve('about.md')
    const req = { method: 'POST', url: `/api/open?file=${encodeURIComponent(targetFile)}`, headers: {} } as http.IncomingMessage
    const res = createMockResponse()

    handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(openEditorSpy).toHaveBeenCalledWith(targetFile)
    const parsed = JSON.parse(res.body)
    expect(parsed.success).toBe(true)
    expect(parsed.file).toBe(targetFile)

    openEditorSpy.mockRestore()
  })

  it('should return 400 on POST /api/open when file param is missing', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const req = { method: 'POST', url: '/api/open', headers: {} } as http.IncomingMessage
    const res = createMockResponse()

    handler(req, res)

    expect(res.statusCode).toBe(400)
    const parsed = JSON.parse(res.body)
    expect(parsed.error).toContain('Missing "file"')
  })

  it('should return 404 for unknown routes', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const req = { method: 'GET', url: '/unknown-route', headers: {} } as http.IncomingMessage
    const res = createMockResponse()

    handler(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('should safely handle requests with malformed Host headers without throwing', () => {
    const sseClients = new Set<http.ServerResponse>()
    const handler = createRequestHandler(entryPath, () => mockGraph, sseClients)

    const req = { method: 'GET', url: '/', headers: { host: 'invalid:host:[bad]' } } as unknown as http.IncomingMessage
    const res = createMockResponse()

    expect(() => handler(req, res)).not.toThrow()
    expect(res.statusCode).toBe(200)
  })
})
