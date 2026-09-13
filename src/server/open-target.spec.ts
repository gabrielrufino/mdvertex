import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import process from 'node:process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultRunner, getBrowserTarget, getEditorTarget, openBrowser, openEditor } from './open-target'

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}))

describe('open-target', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

    it('should trim and handle multiple whitespace separators in custom editor string', () => {
      const target = getEditorTarget('/path/file.md', { EDITOR: '   code   --wait   --goto   ' }, 'linux')
      expect(target).toEqual({
        command: 'code',
        args: ['--wait', '--goto', '/path/file.md'],
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

    it('should execute target via default runner for openBrowser when no runner passed', () => {
      const mockChild = Object.assign(new EventEmitter(), { unref: vi.fn() })
      vi.mocked(spawn).mockReturnValue(mockChild as any)

      openBrowser('http://localhost:3000', 'linux')

      expect(spawn).toHaveBeenCalledWith('xdg-open', ['http://localhost:3000'], {
        detached: true,
        stdio: 'ignore',
        shell: false,
      })
      expect(mockChild.unref).toHaveBeenCalled()
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

    it('should use defaultRunner when openEditor is called with customEditor but without runner', () => {
      const mockChild = Object.assign(new EventEmitter(), { unref: vi.fn() })
      vi.mocked(spawn).mockReturnValue(mockChild as any)

      openEditor('/path/file.md', { EDITOR: 'vim' }, 'linux')

      expect(spawn).toHaveBeenCalledWith('vim', ['/path/file.md'], {
        detached: true,
        stdio: 'ignore',
        shell: false,
      })
      expect(mockChild.unref).toHaveBeenCalled()
    })

    it('should fallback to platform default when code spawn fails with error event in openEditor', async () => {
      const mockChild = Object.assign(new EventEmitter(), { unref: vi.fn() })
      const fallbackChild = Object.assign(new EventEmitter(), { unref: vi.fn() })

      vi.mocked(spawn).mockImplementation((cmd) => {
        if (cmd === 'code') {
          process.nextTick(() => mockChild.emit('error', new Error('ENOENT code')))
          return mockChild as any
        }
        return fallbackChild as any
      })

      openEditor('/path/file.md', {}, 'linux')

      await new Promise(resolve => setTimeout(resolve, 20))

      expect(spawn).toHaveBeenCalledTimes(2)
      expect(spawn).toHaveBeenNthCalledWith(1, 'code', ['/path/file.md'], {
        detached: true,
        stdio: 'ignore',
        shell: false,
      })
      expect(spawn).toHaveBeenNthCalledWith(2, 'xdg-open', ['/path/file.md'], {
        detached: true,
        stdio: 'ignore',
        shell: false,
      })
    })

    it('should fallback to platform default when code spawn throws synchronous exception', () => {
      const fallbackChild = Object.assign(new EventEmitter(), { unref: vi.fn() })

      vi.mocked(spawn).mockImplementation((cmd) => {
        if (cmd === 'code') {
          throw new Error('Sync spawn error')
        }
        return fallbackChild as any
      })

      openEditor('/path/file.md', {}, 'darwin')

      expect(spawn).toHaveBeenCalledTimes(2)
      expect(spawn).toHaveBeenNthCalledWith(1, 'code', ['/path/file.md'], {
        detached: true,
        stdio: 'ignore',
        shell: false,
      })
      expect(spawn).toHaveBeenNthCalledWith(2, 'open', ['/path/file.md'], {
        detached: true,
        stdio: 'ignore',
        shell: false,
      })
    })

    it('defaultRunner should not throw even on spawn error event or spawn throw', () => {
      const mockChild = Object.assign(new EventEmitter(), { unref: vi.fn() })
      vi.mocked(spawn).mockReturnValue(mockChild as any)

      expect(() => {
        defaultRunner('any-cmd', ['arg1'])
        mockChild.emit('error', new Error('silent error'))
      }).not.toThrow()

      vi.mocked(spawn).mockImplementation(() => {
        throw new Error('Immediate error')
      })

      expect(() => {
        defaultRunner('any', ['arg'])
      }).not.toThrow()
    })
  })
})
