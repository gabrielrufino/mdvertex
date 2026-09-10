import { describe, expect, it } from 'vitest'
import { extractLinks } from './parser'

describe('extractLinks', () => {
  it('should extract standard markdown links and ignore external links', () => {
    const content = `
      This is a [link](about.md).
      This is another [link with hash](contact.md#section?query=1).
      This is an [external link](https://google.com).
    `
    const result = extractLinks(content)
    expect(result).toEqual(['about.md', 'contact.md'])
  })

  it('should extract wiki links and handle aliases/hashes', () => {
    const content = `
      Check [[about]].
      Check [[contact|Contact Us]].
      Check [[privacy#section]].
      Check [[policy#section|Our Policy]].
      Check [[external https://google.com]] (ignored or extracted if needed, but handled safely)
    `
    const result = extractLinks(content)
    expect(result).toEqual(['about.md', 'contact.md', 'privacy.md', 'policy.md', 'external https://google.com.md'])
  })
})
