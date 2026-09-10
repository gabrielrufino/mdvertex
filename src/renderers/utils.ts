import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

export function getRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath)
}

export function createHyperlink(text: string, filePath: string): string {
  const url = pathToFileURL(filePath).href
  return `\u001B]8;;${url}\u001B\\${text}\u001B]8;;\u001B\\`
}
