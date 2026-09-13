import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isExcluded } from './is-excluded'

describe('isExcluded', () => {
  const rootDir = path.resolve('/workspace/project')

  it('should return false if patterns array is empty or undefined', () => {
    expect(isExcluded('/workspace/project/docs/intro.md', rootDir)).toBe(false)
    expect(isExcluded('/workspace/project/docs/intro.md', rootDir, [])).toBe(false)
    expect(isExcluded('/workspace/project/docs/intro.md', rootDir, undefined as any)).toBe(false)
  })

  it('should match exact directory names', () => {
    expect(isExcluded('/workspace/project/node_modules/pkg/index.md', rootDir, ['node_modules'])).toBe(true)
    expect(isExcluded('/workspace/project/.git/HEAD', rootDir, ['.git'])).toBe(true)
  })

  it('should match relative paths and nested files', () => {
    expect(isExcluded('/workspace/project/drafts/test.md', rootDir, ['drafts'])).toBe(true)
    expect(isExcluded('/workspace/project/docs/drafts/test.md', rootDir, ['drafts'])).toBe(true)
    // Relative exactly equals cleanPattern
    expect(isExcluded('/workspace/project/docs/intro.md', rootDir, ['docs/intro.md'])).toBe(true)
    // baseName equals cleanPattern
    expect(isExcluded('/workspace/project/docs/secret.txt', rootDir, ['secret.txt'])).toBe(true)
    // normalizedPath endsWith /cleanPattern
    expect(isExcluded('/workspace/project/some/deep/target.md', rootDir, ['deep/target.md'])).toBe(true)
  })

  it('should handle leading ./ and trailing / in patterns', () => {
    expect(isExcluded('/workspace/project/drafts/test.md', rootDir, ['./drafts'])).toBe(true)
    expect(isExcluded('/workspace/project/drafts/test.md', rootDir, ['drafts/'])).toBe(true)
    expect(isExcluded('/workspace/project/drafts/test.md', rootDir, ['./drafts/'])).toBe(true)
    // Should not strip middle ./
    expect(isExcluded('/workspace/project/a./b/c.md', rootDir, ['a./b'])).toBe(true)
  })

  it('should handle Windows backslashes in paths', () => {
    expect(isExcluded('C:\\workspace\\project\\node_modules\\pkg\\index.md', 'C:\\workspace\\project', ['node_modules'])).toBe(true)
    expect(isExcluded('C:\\workspace\\project\\docs\\intro.md', 'C:\\workspace\\project', ['docs/intro.md'])).toBe(true)
  })

  it('should match wildcard patterns', () => {
    expect(isExcluded('/workspace/project/test.spec.md', rootDir, ['*.spec.md'])).toBe(true)
    expect(isExcluded('/workspace/project/sub/test.spec.md', rootDir, ['*.spec.md'])).toBe(true)
    expect(isExcluded('/workspace/project/docs/intro.md', rootDir, ['*.spec.md'])).toBe(false)
    expect(isExcluded('/workspace/project/docs/intro.md', rootDir, ['docs/*.md'])).toBe(true)
    expect(isExcluded('/workspace/project/docs/sub/intro.md', rootDir, ['docs/*.md'])).toBe(false)
    expect(isExcluded('/workspace/project/docs/sub/intro.md', rootDir, ['docs/*/*.md'])).toBe(true)
  })
})
