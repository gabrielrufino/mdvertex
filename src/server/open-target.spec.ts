import { describe, expect, it, vi } from 'vitest'
import { defaultRunner, getBrowserTarget, getEditorTarget, openBrowser, openEditor } from './open-target'

describe('open-target', () => {
  describe('getBrowserTarget', () => {
    it('should return open command for macOS', () => {
      expect(getBrowserTarget('http://localhost:3000', 'darwin')).toEqual({
        command: 'open',
        args: ['http://localhost:3000'],
      })
    })

    it('should return start command for Windows', () => {
      expect(getBrowserTarget('http://localhost:3000', 'win32')).toEqual({
        command: 'cmd',
        args: ['/c', 'start', '', 'http://localhost:3000'],
      })
    })

    it('should return xdg-open command for Linux', () => {
      expect(getBrowserTarget('http://localhost:3000', 'linux')).toEqual({
        command: 'xdg-open',
        args: ['http://localhost:3000'],
      })
    })
  })

  describe('getEditorTarget', () => {
    it('should prioritize VISUAL or EDITOR environment variable when present', () => {
      expect(getEditorTarget('/path/file.md', { VISUAL: 'subl -w' }, 'linux')).toEqual({
        command: 'subl',
        args: ['-w', '/path/file.md'],
      })
      expect(getEditorTarget('/path/file.md', { EDITOR: 'vim' }, 'linux')).toEqual({
        command: 'vim',
        args: ['/path/file.md'],
      })
    })

    it('should return default platform fallback targets when no custom editor is set', () => {
      expect(getEditorTarget('/path/file.md', {}, 'darwin')).toEqual({
        command: 'open',
        args: ['/path/file.md'],
      })
      expect(getEditorTarget('C:\\path\\file.md', {}, 'win32')).toEqual({
        command: 'cmd',
        args: ['/c', 'start', '', 'C:\\path\\file.md'],
      })
      expect(getEditorTarget('/path/file.md', {}, 'linux')).toEqual({
        command: 'xdg-open',
        args: ['/path/file.md'],
      })
    })

    it('should preserve special characters and variable expressions literally in args', () => {
      const complexPath = 'C:\\path\\%USERPROFILE%\\& calc.exe && file.md'
      const target = getEditorTarget(complexPath, { EDITOR: 'notepad' }, 'win32')
      expect(target.command).toBe('notepad')
      expect(target.args).toEqual([complexPath])
    })
  })

  describe('openBrowser and openEditor execution', () => {
    it('should execute target via custom runner for openBrowser', () => {
      const mockRunner = vi.fn()
      openBrowser('http://localhost:3000', 'linux', mockRunner)
      expect(mockRunner).toHaveBeenCalledWith('xdg-open', ['http://localhost:3000'])
    })

    it('should execute target via custom runner for openEditor with custom env', () => {
      const mockRunner = vi.fn()
      openEditor('/path/file.md', { EDITOR: 'nano' }, 'linux', mockRunner)
      expect(mockRunner).toHaveBeenCalledWith('nano', ['/path/file.md'])
    })

    it('should execute code binary via custom runner for openEditor default', () => {
      const mockRunner = vi.fn()
      openEditor('/path/file.md', {}, 'linux', mockRunner)
      expect(mockRunner).toHaveBeenCalledWith('code', ['/path/file.md'])
    })

    it('defaultRunner should not throw even on non-existent command', () => {
      expect(() => {
        defaultRunner('non-existent-command-12345', ['arg1'])
      }).not.toThrow()
    })
  })
})
