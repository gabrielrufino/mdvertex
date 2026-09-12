import { describe, expect, it, vi } from 'vitest'
import { escapeArg, getBrowserCommand, getEditorCommand, openBrowser, openEditor } from './open-target'

describe('open-target', () => {
  describe('escapeArg', () => {
    it('should escape correctly on posix', () => {
      expect(escapeArg('/path/to/my file.md', 'linux')).toBe('\'/path/to/my file.md\'')
      expect(escapeArg('$(rm -rf /)', 'darwin')).toBe('\'$(rm -rf /)\'')
      expect(escapeArg('user\'s file.md', 'linux')).toBe('\'user\'\\\'\'s file.md\'')
    })

    it('should escape correctly on windows', () => {
      expect(escapeArg('C:\\path\\my file.md', 'win32')).toBe('"C:\\path\\my file.md"')
      expect(escapeArg('my "file".md', 'win32')).toBe('"my ""file"".md"')
    })
  })

  describe('getBrowserCommand', () => {
    it('should return open command for macOS', () => {
      expect(getBrowserCommand('http://localhost:3000', 'darwin')).toBe('open \'http://localhost:3000\'')
    })

    it('should return start command for Windows', () => {
      expect(getBrowserCommand('http://localhost:3000', 'win32')).toBe('start "" "http://localhost:3000"')
    })

    it('should return xdg-open command for Linux', () => {
      expect(getBrowserCommand('http://localhost:3000', 'linux')).toBe('xdg-open \'http://localhost:3000\'')
    })
  })

  describe('getEditorCommand', () => {
    it('should prioritize VISUAL or EDITOR environment variable when present', () => {
      expect(getEditorCommand('/path/file.md', { VISUAL: 'subl -w' }, 'linux')).toBe('subl -w \'/path/file.md\'')
      expect(getEditorCommand('/path/file.md', { EDITOR: 'vim' }, 'linux')).toBe('vim \'/path/file.md\'')
    })

    it('should return default platform commands with VS Code fallback', () => {
      expect(getEditorCommand('/path/file.md', {}, 'darwin')).toBe('code \'/path/file.md\' || open \'/path/file.md\'')
      expect(getEditorCommand('/path/file.md', {}, 'win32')).toBe('code "C:\\path\\file.md" || start "" "C:\\path\\file.md"'.replace(/C:\\path\\file\.md/g, '/path/file.md'))
      expect(getEditorCommand('/path/file.md', {}, 'linux')).toBe('code \'/path/file.md\' || xdg-open \'/path/file.md\'')
    })
  })

  describe('openBrowser and openEditor execution', () => {
    it('should execute command via custom executor for openBrowser', () => {
      const mockExecutor = vi.fn((_cmd, cb) => {
        if (typeof cb === 'function')
          cb(null, '', '')
      })

      openBrowser('http://localhost:3000', 'linux', mockExecutor)
      expect(mockExecutor).toHaveBeenCalledWith('xdg-open \'http://localhost:3000\'', expect.any(Function))
    })

    it('should execute command via custom executor for openEditor', () => {
      const mockExecutor = vi.fn((_cmd, cb) => {
        if (typeof cb === 'function')
          cb(null, '', '')
      })

      openEditor('/path/file.md', { EDITOR: 'nano' }, 'linux', mockExecutor)
      expect(mockExecutor).toHaveBeenCalledWith('nano \'/path/file.md\'', expect.any(Function))
    })
  })
})
