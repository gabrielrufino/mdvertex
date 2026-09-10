import { describe, expect, it } from 'vitest'
import { parseLinks } from './parse-links'

describe('parseLinks', () => {
  it('should extract standard markdown links and ignore external links', () => {
    const content = `
      This is a [link](about.md).
      This is another [link with hash](contact.md#section?query=1).
      This is an [external link](https://google.com).
      This is an insecure external link [insecure](http://example.com).
      This is a hash-only link [hash](#section).
      This is an empty link [empty]().
    `
    const result = parseLinks(content)
    expect(result).toEqual(['about.md', 'contact.md'])
  })

  it('should extract wiki links and handle aliases/hashes', () => {
    const content = `
      Check [[about]].
      Check [[contact|Contact Us]].
      Check [[privacy#section]].
      Check [[policy#section|Our Policy]].
      Check [[external https://google.com]] (ignored or extracted if needed, but handled safely)
      Check [[already-md.md]].
      Check [[already-md.md|Alias]].
      Check [[index.md.backup]].
      Check [[   ]].
      Check [[  |Alias]].
      Check [[ #section]].
      Check [[  #section|Alias]].
      Check [[http://example.com|Insecure Wiki]].
      Check [[https://example.com|Secure Wiki]].
    `
    const result = parseLinks(content)
    expect(result).toEqual([
      'about.md',
      'contact.md',
      'privacy.md',
      'policy.md',
      'external https://google.com.md',
      'already-md.md',
      'index.md.backup.md',
    ])
  })
})
