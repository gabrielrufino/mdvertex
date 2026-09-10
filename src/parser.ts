export function extractLinks(content: string): string[] {
  const standardLinkRegex = /\[.*?\]\((?!https?:\/\/)([^)]+)\)/g
  const wikiLinkRegex = /\[\[(?!https?:\/\/)([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g
  const links: string[] = []

  const standardMatches = content.matchAll(standardLinkRegex)
  for (const match of standardMatches) {
    const cleaned = match[1].split(/[?#]/)[0]
    if (cleaned) {
      links.push(cleaned)
    }
  }

  const wikiMatches = content.matchAll(wikiLinkRegex)
  for (const match of wikiMatches) {
    let target = match[1].trim()
    if (!target) {
      continue
    }

    if (!/\.md$/i.test(target)) {
      target += '.md'
    }
    links.push(target)
  }

  return Array.from(new Set(links))
}
