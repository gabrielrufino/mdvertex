import { exec } from 'node:child_process'
import process from 'node:process'

export type CommandExecutor = (command: string, callback?: (error: Error | null, stdout: string, stderr: string) => void) => void

export function escapeArg(arg: string, platform = process.platform): string {
  if (platform === 'win32') {
    // Escape double quotes by doubling them (Windows cmd convention)
    return `"${arg.replace(/"/g, '""')}"`
  }
  // Enclose in single quotes and escape internal single quotes
  return `'${arg.replace(/'/g, '\'\\\'\'')}'`
}

export function getBrowserCommand(url: string, platform = process.platform): string {
  const escapedUrl = escapeArg(url, platform)
  if (platform === 'darwin') {
    return `open ${escapedUrl}`
  }
  if (platform === 'win32') {
    return `start "" ${escapedUrl}`
  }
  return `xdg-open ${escapedUrl}`
}

export function openBrowser(url: string, platform = process.platform, executor: CommandExecutor = exec): void {
  const command = getBrowserCommand(url, platform)
  executor(command, () => {
    // Fail silently in headless or test environments
  })
}

export function getEditorCommand(filePath: string, env = process.env, platform = process.platform): string {
  const escapedPath = escapeArg(filePath, platform)
  const customEditor = env.VISUAL || env.EDITOR
  if (customEditor) {
    return `${customEditor} ${escapedPath}`
  }

  if (platform === 'darwin') {
    return `code ${escapedPath} || open ${escapedPath}`
  }
  if (platform === 'win32') {
    return `code ${escapedPath} || start "" ${escapedPath}`
  }
  return `code ${escapedPath} || xdg-open ${escapedPath}`
}

export function openEditor(filePath: string, env = process.env, platform = process.platform, executor: CommandExecutor = exec): void {
  const command = getEditorCommand(filePath, env, platform)
  executor(command, () => {
    // Fail silently if editor is unavailable
  })
}
