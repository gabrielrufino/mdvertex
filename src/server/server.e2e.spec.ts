import type http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getRelativePath } from '../utils'
import { startServer } from './server'

describe('server e2e', () => {
  let tempDir: string
  let entryPath: string
  let aPath: string
  let serverInstance: { server: http.Server, port: number, url: string, close: () => Promise<void> }

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdvertex-server-e2e-'))
    entryPath = path.join(tempDir, 'entry.md')
    aPath = path.join(tempDir, 'a.md')

    fs.writeFileSync(entryPath, '# Entry\n\nLink to [A](./a.md)', 'utf8')
    fs.writeFileSync(aPath, '# Doc A\n', 'utf8')

    serverInstance = await startServer({
      entryPath,
      open: false,
      port: 3500 + Math.floor(Math.random() * 500),
    })
  })

  afterAll(async () => {
    await serverInstance.close()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('gET / should serve the interactive HTML interface', async () => {
    const res = await fetch(serverInstance.url)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')

    const text = await res.text()
    expect(text).toContain('<!DOCTYPE html>')
    expect(text).toContain(getRelativePath(entryPath))
    expect(text).toContain(getRelativePath(aPath))
  })

  it('gET /api/graph should return valid JSON graph and mermaid code', async () => {
    const res = await fetch(`${serverInstance.url}/api/graph`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')

    const data = await res.json()
    expect(data.entry).toBe(entryPath)
    expect(data.relativeEntry).toBe(getRelativePath(entryPath))
    expect(data.mermaid).toContain('flowchart TD')
    expect(data.mermaid).toContain(getRelativePath(aPath))
  })

  it('pOST /api/open should open requested file and return 200', async () => {
    const res = await fetch(`${serverInstance.url}/api/open?file=${encodeURIComponent(aPath)}`, {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.file).toBe(aPath)
  })

  it('gET /events should stream real-time updates when markdown files change', async () => {
    const bPath = path.join(tempDir, 'b.md')
    fs.writeFileSync(bPath, '# Doc B\n', 'utf8')

    const response = await fetch(`${serverInstance.url}/events`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')

    const reader = response.body?.getReader()
    expect(reader).toBeDefined()

    const updateReceivedPromise = new Promise<string>((resolve, reject) => {
      const decoder = new TextDecoder()
      let accumulated = ''

      function readChunk() {
        reader!.read().then(({ done, value }) => {
          if (done)
            return
          const chunk = decoder.decode(value, { stream: true })
          accumulated += chunk
          if (accumulated.includes('b.md')) {
            resolve(accumulated)
            return
          }
          readChunk()
        }).catch(reject)
      }

      readChunk()
    })

    // Modify entry.md to trigger watcher and SSE broadcast
    setTimeout(() => {
      fs.writeFileSync(entryPath, '# Entry\n\nLink to [A](./a.md) and [B](./b.md)', 'utf8')
    }, 100)

    const receivedData = await updateReceivedPromise
    expect(receivedData).toContain('b.md')
    await reader?.cancel()
  })
})
