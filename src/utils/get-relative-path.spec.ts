import path from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { getRelativePath } from './get-relative-path'

describe('getRelativePath', () => {
  it('should return a relative path from the current working directory', () => {
    const absolute = path.resolve(process.cwd(), 'src/utils/get-relative-path.ts')
    const result = getRelativePath(absolute)
    expect(result).toBe('src/utils/get-relative-path.ts')
  })
})
