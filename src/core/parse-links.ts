import type { LinkPosition, ParsedLink } from '../types'

export interface ParseLinksOptions {
  external?: boolean
}

function computeLineOffsets(content: string): number[] {
  const offsets = [0]
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      offsets.push(i + 1)
    }
  }
  return offsets
}

function getPosition(offsets: number[], index: number): LinkPosition {
  let low = 0
  let high = offsets.length - 1
  let lineIdx = 0

  while (low <= high) {
    const mid = (low + high) >> 1
    if (offsets[mid] <= index) {
      lineIdx = mid
      low = mid + 1
    }
    else {
      high = mid - 1
    }
  }

  return {
    line: lineIdx + 1,
    column: index - offsets[lineIdx] + 1,
  }
}

export function parseLinks(content: string, options: ParseLinksOptions = {}): ParsedLink[] {
  const standardLinkRegex = /\[.*?\]\(([^)]+)\)/g
  const wikiLinkRegex = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g

  const offsets = computeLineOffsets(content)
  const items: Array<ParsedLink & { index: number }> = []

  for (const match of content.matchAll(standardLinkRegex)) {
    const rawTarget = match[1].trim()
    const isExternal = /^https?:\/\//i.test(rawTarget)

    if (isExternal && !options.external) {
      continue
    }

    const cleaned = isExternal ? rawTarget : rawTarget.split(/[?#]/)[0].trim()
    if (!cleaned) {
      continue
    }

    const index = match.index ?? 0
    const pos = getPosition(offsets, index)

    items.push({
      raw: rawTarget,
      target: cleaned,
      line: pos.line,
      column: pos.column,
      isExternal,
      index,
    })
  }

  for (const match of content.matchAll(wikiLinkRegex)) {
    const rawTarget = match[1].trim()
    if (!rawTarget) {
      continue
    }

    const isExternal = /^https?:\/\//i.test(rawTarget)
    if (isExternal && !options.external) {
      continue
    }

    let target = rawTarget
    if (!isExternal && !/\.md$/i.test(target)) {
      target += '.md'
    }

    const index = match.index ?? 0
    const pos = getPosition(offsets, index)

    items.push({
      raw: rawTarget,
      target,
      line: pos.line,
      column: pos.column,
      isExternal,
      index,
    })
  }

  items.sort((a, b) => a.index - b.index)

  return items.map(({ index: _, ...link }) => link)
}
