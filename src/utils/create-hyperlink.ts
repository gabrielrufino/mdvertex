import { pathToFileURL } from 'node:url'

export function createHyperlink(text: string, filePath: string): string {
  const url = pathToFileURL(filePath).href
  return `\u001B]8;;${url}\u001B\\${text}\u001B]8;;\u001B\\`
}
