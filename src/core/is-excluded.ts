import path from 'node:path'

function globToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('**')
    .map(part =>
      part
        .split('*')
        .map(segment => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*')

  return new RegExp(`^${source}$`)
}

/**
 * Checks if a path should be excluded based on exclusion patterns.
 * Supports directory names, relative paths, and basic glob patterns (*).
 */
export function isExcluded(targetPath: string, rootDir: string, patterns: string[] = []): boolean {
  if (!patterns || patterns.length === 0) {
    return false
  }

  const relative = path.relative(rootDir, targetPath).replace(/\\/g, '/')
  const normalizedPath = targetPath.replace(/\\/g, '/')
  const baseName = path.basename(targetPath)

  for (const pattern of patterns) {
    const cleanPattern = pattern.replace(/^\.\//, '').replace(/\/$/, '')

    if (
      relative === cleanPattern
      || relative.startsWith(`${cleanPattern}/`)
      || normalizedPath.includes(`/${cleanPattern}/`)
      || normalizedPath.endsWith(`/${cleanPattern}`)
      || baseName === cleanPattern
    ) {
      return true
    }

    if (cleanPattern.includes('*')) {
      const regexPattern = globToRegExp(cleanPattern)
      if (regexPattern.test(relative) || regexPattern.test(baseName)) {
        return true
      }
    }
  }

  return false
}
