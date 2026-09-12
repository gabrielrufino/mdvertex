import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mapDependencies } from '../core'
import { createFileWatcher } from './watcher'

describe('createFileWatcher', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdvertex-watcher-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should detect file changes and notify listener with updated graph', async () => {
    const mainPath = path.join(tempDir, 'main.md')
    const subPath = path.join(tempDir, 'sub.md')

    fs.writeFileSync(mainPath, 'Initial [sub](./sub.md)', 'utf8')
    fs.writeFileSync(subPath, 'Sub content', 'utf8')

    const initialGraph = mapDependencies(mainPath)
    const onChange = vi.fn()

    const watcher = createFileWatcher(mainPath, initialGraph, onChange, 50)

    try {
      const extraPath = path.join(tempDir, 'extra.md')
      fs.writeFileSync(extraPath, 'Extra file', 'utf8')
      fs.writeFileSync(mainPath, 'Updated [sub](./sub.md) and [extra](./extra.md)', 'utf8')

      await new Promise(resolve => setTimeout(resolve, 200))

      expect(onChange).toHaveBeenCalled()
      const lastCallArg = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCallArg.has(extraPath)).toBe(true)
    }
    finally {
      watcher.close()
    }
  })

  it('should not fire onChange after watcher is closed', async () => {
    const mainPath = path.join(tempDir, 'main.md')
    fs.writeFileSync(mainPath, 'Hello', 'utf8')

    const initialGraph = mapDependencies(mainPath)
    const onChange = vi.fn()

    const watcher = createFileWatcher(mainPath, initialGraph, onChange, 50)
    watcher.close()

    fs.writeFileSync(mainPath, 'Modified Hello', 'utf8')
    await new Promise(resolve => setTimeout(resolve, 150))

    expect(onChange).not.toHaveBeenCalled()
  })
})
