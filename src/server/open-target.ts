import { spawn } from 'node:child_process'
import process from 'node:process'

export type CommandRunner = (command: string, args: string[]) => void

export function getBrowserTarget(url: string, platform = process.platform): { command: string, args: string[] } {
  if (platform === 'darwin') {
    return { command: 'open', args: [url] }
  }
  if (platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', '', url] }
  }
  return { command: 'xdg-open', args: [url] }
}

export function parseCommand(commandStr: string): string[] {
  const matches = commandStr.match(/(?:[^\s"']|"[^"]*"|'[^']*')+/g)
  if (!matches) {
    return []
  }
  return matches.map((arg) => {
    if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith('\'') && arg.endsWith('\''))) {
      return arg.slice(1, -1)
    }
    return arg
  })
}

export function getEditorTarget(filePath: string, env = process.env, platform = process.platform): { command: string, args: string[] } {
  const customEditor = env.VISUAL || env.EDITOR
  if (customEditor) {
    const parts = parseCommand(customEditor.trim())
    if (parts.length > 0) {
      return { command: parts[0], args: [...parts.slice(1), filePath] }
    }
  }

  if (platform === 'darwin') {
    return { command: 'open', args: [filePath] }
  }
  if (platform === 'win32') {
    return { command: 'explorer.exe', args: [filePath] }
  }
  return { command: 'xdg-open', args: [filePath] }
}

export function defaultRunner(command: string, args: string[]): void {
  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      shell: false,
    })
    child.unref()
    child.on('error', () => {
      // Fail silently
    })
  }
  catch {
    // Fail silently
  }
}

export function openBrowser(url: string, platform = process.platform, runner: CommandRunner = defaultRunner): void {
  const target = getBrowserTarget(url, platform)
  runner(target.command, target.args)
}

export function openEditor(
  filePath: string,
  env = process.env,
  platform = process.platform,
  runner?: CommandRunner,
): void {
  const customEditor = env.VISUAL || env.EDITOR
  if (customEditor) {
    const target = getEditorTarget(filePath, env, platform)
    if (runner) {
      runner(target.command, target.args)
    }
    else {
      defaultRunner(target.command, target.args)
    }
    return
  }

  if (runner) {
    runner('code', [filePath])
    return
  }

  try {
    const child = spawn('code', [filePath], {
      detached: true,
      stdio: 'ignore',
      shell: false,
    })
    child.unref()
    child.on('error', () => {
      const fallback = getEditorTarget(filePath, env, platform)
      defaultRunner(fallback.command, fallback.args)
    })
  }
  catch {
    const fallback = getEditorTarget(filePath, env, platform)
    defaultRunner(fallback.command, fallback.args)
  }
}
