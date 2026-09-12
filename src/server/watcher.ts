import type { DependencyGraph } from '../types'
import fs from 'node:fs'
import path from 'node:path'
import { mapDependencies } from '../core'

export interface FileWatcher {
  close: () => void
  updateWatchedFiles: (graph: DependencyGraph) => void
}

export function createFileWatcher(
  entryPath: string,
  initialGraph: DependencyGraph,
  onChange: (newGraph: DependencyGraph) => void,
  debounceMs = 100,
): FileWatcher {
  const absoluteEntry = path.resolve(entryPath)
  const watchers = new Map<string, fs.FSWatcher>()
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let isClosed = false

  function getPathsToWatch(graph: DependencyGraph): Set<string> {
    const paths = new Set<string>()
    paths.add(path.dirname(absoluteEntry))

    for (const [filePath, node] of graph.entries()) {
      if (node.exists) {
        paths.add(filePath)
      }
      paths.add(path.dirname(filePath))
    }
    return paths
  }

  function handleFsChange() {
    if (isClosed)
      return
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      if (isClosed)
        return
      const updatedGraph = mapDependencies(absoluteEntry)
      updateWatchedFiles(updatedGraph)
      onChange(updatedGraph)
    }, debounceMs)
  }

  function updateWatchedFiles(graph: DependencyGraph) {
    if (isClosed)
      return
    const targetPaths = getPathsToWatch(graph)

    for (const [watchedPath, watcher] of watchers.entries()) {
      if (!targetPaths.has(watchedPath)) {
        watcher.close()
        watchers.delete(watchedPath)
      }
    }

    for (const targetPath of targetPaths) {
      if (!watchers.has(targetPath) && fs.existsSync(targetPath)) {
        try {
          const watcher = fs.watch(targetPath, handleFsChange)
          watchers.set(targetPath, watcher)
        }
        catch {
          // Ignore watch errors on restricted/transient files
        }
      }
    }
  }

  function close() {
    isClosed = true
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    for (const watcher of watchers.values()) {
      watcher.close()
    }
    watchers.clear()
  }

  updateWatchedFiles(initialGraph)

  return {
    close,
    updateWatchedFiles,
  }
}
