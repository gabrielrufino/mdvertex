import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getRelativePath } from './utils'

describe('cli e2e', () => {
  let tempDir: string
  let entryFile: string
  let childFile: string
  const binPath = path.resolve('dist/index.js')

  beforeAll(() => {
    execSync('npm run build', { stdio: 'pipe' })

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdvertex-cli-e2e-'))
    entryFile = path.join(tempDir, 'main.md')
    childFile = path.join(tempDir, 'child.md')

    fs.writeFileSync(entryFile, '# Main\n\n[Child](./child.md)', 'utf8')
    fs.writeFileSync(childFile, '# Child\n', 'utf8')
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should output tree format when --format tree is specified', () => {
    const stdout = execSync(`node "${binPath}" "${entryFile}" --format tree`, {
      encoding: 'utf8',
    })
    expect(stdout).toContain(getRelativePath(entryFile))
    expect(stdout).toContain(getRelativePath(childFile))
  })

  it('should output mermaid format when --format mermaid is specified', () => {
    const stdout = execSync(`node "${binPath}" "${entryFile}" --format mermaid`, {
      encoding: 'utf8',
    })
    expect(stdout).toContain('flowchart TD')
    expect(stdout).toContain(getRelativePath(entryFile))
  })

  it('should output json format when --format json is specified', () => {
    const stdout = execSync(`node "${binPath}" "${entryFile}" --format json`, {
      encoding: 'utf8',
    })
    const parsed = JSON.parse(stdout)
    expect(parsed.entry).toBe(getRelativePath(entryFile))
    expect(parsed.files[getRelativePath(entryFile)]).toBeDefined()
  })

  it('should start live preview server by default', async () => {
    const testPort = 4200 + Math.floor(Math.random() * 300)
    const proc = spawn('node', [binPath, entryFile, '--no-open', '--port', String(testPort)], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CONSOLA_LEVEL: '3' },
    })

    const startedPromise = new Promise<string>((resolve, reject) => {
      proc.stdout.on('data', (data) => {
        const text = data.toString()
        if (text.includes('Local:')) {
          resolve(text)
        }
      })
      proc.stderr.on('data', (data) => {
        reject(new Error(data.toString()))
      })
      proc.on('error', reject)
    })

    const output = await startedPromise
    expect(output).toContain(`http://localhost:${testPort}`)

    const res = await fetch(`http://localhost:${testPort}/api/graph`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.relativeEntry).toBe(getRelativePath(entryFile))

    proc.kill('SIGTERM')
  })
})
