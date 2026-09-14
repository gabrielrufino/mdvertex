import { describe, expect, it } from 'vitest'
import { parseLinks } from './parse-links'

describe('parseLinks', () => {
  it('should extract standard markdown links with exact line and column', () => {
    const content = 'Line 1\nThis is a [link](about.md) on line 2.\nAnd [another](contact.md#section?query=1) on line 3.'
    const result = parseLinks(content)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      raw: 'about.md',
      target: 'about.md',
      line: 2,
      column: 11,
      isExternal: false,
    })
    expect(result[1]).toEqual({
      raw: 'contact.md#section?query=1',
      target: 'contact.md',
      line: 3,
      column: 5,
      isExternal: false,
    })
  })

  it('should extract wiki links with aliases and anchors', () => {
    const content = 'Check [[about]].\nCheck [[contact|Contact Us]].\nCheck [[privacy#section]].'
    const result = parseLinks(content)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      raw: 'about',
      target: 'about.md',
      line: 1,
      column: 7,
      isExternal: false,
    })
    expect(result[1]).toEqual({
      raw: 'contact',
      target: 'contact.md',
      line: 2,
      column: 7,
      isExternal: false,
    })
    expect(result[2]).toEqual({
      raw: 'privacy',
      target: 'privacy.md',
      line: 3,
      column: 7,
      isExternal: false,
    })
  })

  it('should ignore external links by default', () => {
    const content = 'See [Google](https://google.com) and [[http://example.com|Example]].'
    const result = parseLinks(content)
    expect(result).toEqual([])
  })

  it('should capture external links when external option is true', () => {
    const content = 'See [Google](https://google.com) and [[http://example.com]].'
    const result = parseLinks(content, { external: true })

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      raw: 'https://google.com',
      target: 'https://google.com',
      line: 1,
      column: 5,
      isExternal: true,
    })
    expect(result[1]).toEqual({
      raw: 'http://example.com',
      target: 'http://example.com',
      line: 1,
      column: 38,
      isExternal: true,
    })
  })

  it('should skip empty standard and wiki links or links containing only anchor/query/whitespace', () => {
    const content = '[empty]()\n[hash](#top)\n[query](?foo)\n[spaces](   )\n[[ ]]\n[[ | Alias]]\n[[#only-anchor]]\n[valid](valid.md)'
    const result = parseLinks(content)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      raw: 'valid.md',
      target: 'valid.md',
      line: 8,
      column: 1,
      isExternal: false,
    })
  })

  it('should trim whitespace around targets and parameters', () => {
    const content = '[spaced](  about.md  )\n[query-spaced]( about.md?param=1 )\n[[  about  ]]'
    const result = parseLinks(content)

    expect(result).toHaveLength(3)
    expect(result[0].target).toBe('about.md')
    expect(result[0].raw).toBe('about.md')
    expect(result[1].target).toBe('about.md')
    expect(result[1].raw).toBe('about.md?param=1')
    expect(result[2].target).toBe('about.md')
    expect(result[2].raw).toBe('about')
  })

  it('should maintain chronological order when mixing standard and wiki links across lines', () => {
    const content = '[first](first.md)\n[[second]]\n[third](third.md)\nLine 4: [fourth](fourth.md)\n\n\n\nLine 8: [[seventh]]'
    const result = parseLinks(content)

    expect(result.map(r => r.target)).toEqual([
      'first.md',
      'second.md',
      'third.md',
      'fourth.md',
      'seventh.md',
    ])
    expect(result[4].line).toBe(8)
  })

  it('should correctly distinguish http vs non-http protocols', () => {
    const content = '[http](http://example.com)\n[https](https://example.com)\n[custom](myhttp://local.md)'
    const result = parseLinks(content)

    // http and https are ignored by default; custom is kept
    expect(result).toHaveLength(1)
    expect(result[0].target).toBe('myhttp://local.md')
  })
})
