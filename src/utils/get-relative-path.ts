import path from 'node:path'
import process from 'node:process'

export function getRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath)
}
