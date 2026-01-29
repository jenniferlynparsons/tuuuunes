/**
 * Tests for the Settings module
 */

const path = require('path')
const os = require('os')

// Mock electron-store before requiring the settings module
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => {
    let store = {}
    return {
      get: jest.fn((key) => {
        if (key === undefined) return store
        const keys = key.split('.')
        let value = store
        for (const k of keys) {
          if (value === undefined || value === null) return undefined
          value = value[k]
        }
        return value
      }),
      set: jest.fn((key, value) => {
        if (typeof key === 'object') {
          store = { ...store, ...key }
        } else {
          const keys = key.split('.')
          let obj = store
          for (let i = 0; i < keys.length - 1; i++) {
            if (obj[keys[i]] === undefined) obj[keys[i]] = {}
            obj = obj[keys[i]]
          }
          obj[keys[keys.length - 1]] = value
        }
      }),
      has: jest.fn((key) => {
        const keys = key.split('.')
        let value = store
        for (const k of keys) {
          if (value === undefined || value === null) return false
          value = value[k]
        }
        return value !== undefined
      }),
      delete: jest.fn((key) => {
        const keys = key.split('.')
        let obj = store
        for (let i = 0; i < keys.length - 1; i++) {
          if (obj[keys[i]] === undefined) return
          obj = obj[keys[i]]
        }
        delete obj[keys[keys.length - 1]]
      }),
      clear: jest.fn(() => {
        store = {}
      }),
      reset: jest.fn((key) => {
        const keys = key.split('.')
        let obj = store
        for (let i = 0; i < keys.length - 1; i++) {
          if (obj[keys[i]] === undefined) return
          obj = obj[keys[i]]
        }
        delete obj[keys[keys.length - 1]]
      }),
      store: store,
      path: '/mock/config.json',
      onDidChange: jest.fn(() => () => {}),
      onDidAnyChange: jest.fn(() => () => {}),
    }
  })
})

// Now require the settings module
const settings = require('./settings')

describe('Settings Module', () => {
  beforeEach(() => {
    // Reset module between tests
    jest.clearAllMocks()
  })

  describe('get/set operations', () => {
    test('should set and get a simple value', () => {
      settings.set('ui.theme', 'light')
      expect(settings.get('ui.theme')).toBe('light')
    })

    test('should set and get nested values', () => {
      settings.set('library.path', '/custom/path')
      expect(settings.get('library.path')).toBe('/custom/path')
    })

    test('should return undefined for non-existent keys', () => {
      expect(settings.get('nonexistent.key')).toBeUndefined()
    })
  })

  describe('has operation', () => {
    test('should return true for existing keys', () => {
      settings.set('ui.theme', 'dark')
      expect(settings.has('ui.theme')).toBe(true)
    })

    test('should return false for non-existent keys', () => {
      expect(settings.has('nonexistent.key')).toBe(false)
    })
  })

  describe('delete operation', () => {
    test('should delete a setting', () => {
      settings.set('ui.sidebarWidth', 250)
      settings.delete('ui.sidebarWidth')
      expect(settings.has('ui.sidebarWidth')).toBe(false)
    })
  })

  describe('getPath', () => {
    test('should return the config file path', () => {
      expect(settings.getPath()).toBe('/mock/config.json')
    })
  })

  describe('defaults', () => {
    test('should have correct default library path', () => {
      const expectedPath = path.join(os.homedir(), 'Music', 'Tuuuuunes')
      expect(settings.defaults.library.path).toBe(expectedPath)
    })

    test('should have correct default theme', () => {
      expect(settings.defaults.ui.theme).toBe('dark')
    })

    test('should have correct default view', () => {
      expect(settings.defaults.ui.defaultView).toBe('library')
    })

    test('should have correct default window dimensions', () => {
      expect(settings.defaults.window.width).toBe(1200)
      expect(settings.defaults.window.height).toBe(800)
    })

    test('should have correct default import mode', () => {
      expect(settings.defaults.import.mode).toBe('copy')
    })
  })

  describe('window state helpers', () => {
    test('getWindowState should return window configuration', () => {
      const state = settings.getWindowState()
      expect(state).toHaveProperty('width')
      expect(state).toHaveProperty('height')
      expect(state).toHaveProperty('isMaximized')
    })

    test('saveWindowState should save window bounds', () => {
      const mockWindow = {
        isMaximized: () => false,
        getBounds: () => ({ width: 1000, height: 700, x: 100, y: 50 }),
      }
      settings.saveWindowState(mockWindow)
      const state = settings.get('window')
      expect(state).toEqual({
        width: 1000,
        height: 700,
        x: 100,
        y: 50,
        isMaximized: false,
      })
    })

    test('saveWindowState should handle null window', () => {
      expect(() => settings.saveWindowState(null)).not.toThrow()
    })
  })

  describe('session state helpers', () => {
    test('saveLastSession should save session state', () => {
      settings.saveLastSession({
        view: 'albums',
        playlistId: 5,
      })
      const session = settings.get('lastSession')
      expect(session.view).toBe('albums')
      expect(session.playlistId).toBe(5)
    })

    test('getLastSession should return session state', () => {
      settings.set('lastSession', {
        view: 'playlists',
        playlistId: 3,
        sortColumn: 'title',
        sortDirection: 'asc',
      })
      const session = settings.getLastSession()
      expect(session.view).toBe('playlists')
      expect(session.playlistId).toBe(3)
    })
  })
})
