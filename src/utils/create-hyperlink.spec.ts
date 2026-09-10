import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createHyperlink } from './create-hyperlink'

describe('createHyperlink', () => {
  it('should return a valid ANSI terminal hyperlink escape sequence', () => {
    const text = 'test'
    const filePath = '/absolute/path/to/file.md'
    const expectedUrl = pathToFileURL(filePath).href
    const result = createHyperlink(text, filePath)

    expect(result).toBe(`\u001B]8;;${expectedUrl}\u001B\\${text}\u001B]8;;\u001B\\`)
  })
})
