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
    let resolveChange!: (graph: unknown) => void
    const changePromise = new Promise((resolve) => {
      resolveChange = resolve
    })
    const onChange = vi.fn((graph) => {
      resolveChange(graph)
    })

    const watcher = createFileWatcher(mainPath, initialGraph, onChange, 50)

    try {
      const extraPath = path.join(tempDir, 'extra.md')
      fs.writeFileSync(extraPath, 'Extra file', 'utf8')
      fs.writeFileSync(mainPath, 'Updated [sub](./sub.md) and [extra](./extra.md)', 'utf8')

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Watcher onChange timed out')), 3000),
      )

      await Promise.race([changePromise, timeoutPromise])

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

  it('should work when watching a directory entry', async () => {
    const subDir = path.join(tempDir, 'subvault')
    fs.mkdirSync(subDir, { recursive: true })
    const file1 = path.join(subDir, 'file1.md')
    fs.writeFileSync(file1, 'Hello in dir', 'utf8')

    let resolveChange!: (graph: unknown) => void
    const changePromise = new Promise((resolve) => {
      resolveChange = resolve
    })
    const onChange = vi.fn((graph) => {
      resolveChange(graph)
    })

    const initialGraph = mapDependencies(file1)
    const watcher = createFileWatcher(subDir, initialGraph, onChange, 50)

    try {
      const file2 = path.join(subDir, 'file2.md')
      fs.writeFileSync(file2, 'Second file', 'utf8')

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Directory watcher timed out')), 3000),
      )

      await Promise.race([changePromise, timeoutPromise])
      expect(onChange).toHaveBeenCalled()
    }
    finally {
      watcher.close()
    }
  })

  it('should coalesce multiple rapid changes into a single debounce execution', async () => {
    const mainPath = path.join(tempDir, 'main.md')
    fs.writeFileSync(mainPath, 'Initial', 'utf8')

    const initialGraph = mapDependencies(mainPath)
    let resolveChange!: () => void
    const changePromise = new Promise<void>((resolve) => {
      resolveChange = resolve
    })
    const onChange = vi.fn(() => {
      resolveChange()
    })

    const watcher = createFileWatcher(mainPath, initialGraph, onChange, 100)

    try {
      // Rapid modifications
      fs.writeFileSync(mainPath, 'Edit 1', 'utf8')
      await new Promise(resolve => setTimeout(resolve, 20))
      fs.writeFileSync(mainPath, 'Edit 2', 'utf8')
      await new Promise(resolve => setTimeout(resolve, 20))
      fs.writeFileSync(mainPath, 'Edit 3', 'utf8')

      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Watcher debounce timed out')), 3000),
      )

      await Promise.race([changePromise, timeoutPromise])
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(onChange).toHaveBeenCalledTimes(1)
    }
    finally {
      watcher.close()
    }
  })

  it('should dynamically remove watchers when files are no longer in the graph and handle non-existent targets', () => {
    const mainPath = path.join(tempDir, 'main.md')
    const subPath = path.join(tempDir, 'sub.md')
    const missingPath = path.join(tempDir, 'missing.md')

    fs.writeFileSync(mainPath, 'Main', 'utf8')
    fs.writeFileSync(subPath, 'Sub', 'utf8')

    const watchSpy = vi.spyOn(fs, 'watch')

    const graphWithSub = new Map([
      [mainPath, { filePath: mainPath, exists: true, references: [subPath, missingPath], links: [] }],
      [subPath, { filePath: subPath, exists: true, references: [], links: [] }],
      [missingPath, { filePath: missingPath, exists: false, references: [], links: [] }],
    ])

    const watcher = createFileWatcher(mainPath, graphWithSub, vi.fn(), 50)

    // Now update graph without subPath
    const graphWithoutSub = new Map([
      [mainPath, { filePath: mainPath, exists: true, references: [], links: [] }],
    ])

    expect(() => watcher.updateWatchedFiles(graphWithoutSub)).not.toThrow()

    // Test that close cleans up everything and further updateWatchedFiles does nothing
    watcher.close()
    expect(() => watcher.updateWatchedFiles(graphWithSub)).not.toThrow()
    watchSpy.mockRestore()
  })
})
