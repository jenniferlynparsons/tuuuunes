/**
 * Settings module for persistent user preferences
 * Uses electron-store for JSON-based storage
 */

const Store = require('electron-store')
const os = require('os')
const path = require('path')

/**
 * Schema for settings validation
 * electron-store will validate all values against this schema
 */
const schema = {
  library: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        default: path.join(os.homedir(), 'Music', 'Tuuuuunes'),
      },
    },
    default: {},
  },
  import: {
    type: 'object',
    properties: {
      // V1 only supports copy mode
      mode: {
        type: 'string',
        enum: ['copy'],
        default: 'copy',
      },
      skipDuplicates: {
        type: 'boolean',
        default: true,
      },
    },
    default: {},
  },
  ui: {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        enum: ['dark', 'light'],
        default: 'dark',
      },
      defaultView: {
        type: 'string',
        enum: ['library', 'albums', 'artists', 'playlists'],
        default: 'library',
      },
      sidebarWidth: {
        type: 'number',
        minimum: 150,
        maximum: 400,
        default: 200,
      },
    },
    default: {},
  },
  window: {
    type: 'object',
    properties: {
      width: {
        type: 'number',
        minimum: 400,
        default: 1200,
      },
      height: {
        type: 'number',
        minimum: 300,
        default: 800,
      },
      x: {
        type: 'number',
      },
      y: {
        type: 'number',
      },
      isMaximized: {
        type: 'boolean',
        default: false,
      },
    },
    default: {},
  },
  lastSession: {
    type: 'object',
    properties: {
      view: {
        type: 'string',
        default: 'library',
      },
      playlistId: {
        type: ['number', 'null'],
        default: null,
      },
      sortColumn: {
        type: 'string',
        default: 'date_added',
      },
      sortDirection: {
        type: 'string',
        enum: ['asc', 'desc'],
        default: 'desc',
      },
    },
    default: {},
  },
}

/**
 * Default settings applied on first launch
 */
const defaults = {
  library: {
    path: path.join(os.homedir(), 'Music', 'Tuuuuunes'),
  },
  import: {
    mode: 'copy',
    skipDuplicates: true,
  },
  ui: {
    theme: 'dark',
    defaultView: 'library',
    sidebarWidth: 200,
  },
  window: {
    width: 1200,
    height: 800,
    isMaximized: false,
  },
  lastSession: {
    view: 'library',
    playlistId: null,
    sortColumn: 'date_added',
    sortDirection: 'desc',
  },
}

// Singleton store instance
let store = null

/**
 * Initialize and return the settings store
 * Creates the store with schema validation if not already initialized
 */
function getStore() {
  if (!store) {
    store = new Store({
      name: 'config',
      schema,
      defaults,
      clearInvalidConfig: true, // Reset invalid config to defaults
    })
    console.log('[Settings] Store initialized at:', store.path)
  }
  return store
}

/**
 * Get a setting value by key path (dot notation supported)
 * @param {string} key - Setting key (e.g., 'library.path' or 'ui.theme')
 * @returns {*} Setting value or undefined
 */
function get(key) {
  return getStore().get(key)
}

/**
 * Set a setting value by key path
 * @param {string} key - Setting key
 * @param {*} value - Value to set
 */
function set(key, value) {
  getStore().set(key, value)
}

/**
 * Get all settings
 * @returns {object} All settings
 */
function getAll() {
  return getStore().store
}

/**
 * Set multiple settings at once
 * @param {object} settings - Object with settings to set
 */
function setAll(settings) {
  getStore().set(settings)
}

/**
 * Reset a specific setting to its default value
 * @param {string} key - Setting key to reset
 */
function reset(key) {
  getStore().reset(key)
}

/**
 * Reset all settings to defaults
 */
function resetAll() {
  getStore().clear()
}

/**
 * Check if a setting exists
 * @param {string} key - Setting key
 * @returns {boolean}
 */
function has(key) {
  return getStore().has(key)
}

/**
 * Delete a setting
 * @param {string} key - Setting key to delete
 */
function deleteSetting(key) {
  getStore().delete(key)
}

/**
 * Get the path to the settings file
 * @returns {string} Absolute path to config file
 */
function getPath() {
  return getStore().path
}

/**
 * Watch for changes to a specific setting
 * @param {string} key - Setting key to watch
 * @param {Function} callback - Called with (newValue, oldValue)
 * @returns {Function} Unsubscribe function
 */
function onDidChange(key, callback) {
  return getStore().onDidChange(key, callback)
}

/**
 * Watch for any change to settings
 * @param {Function} callback - Called with (newValue, oldValue) for entire store
 * @returns {Function} Unsubscribe function
 */
function onDidAnyChange(callback) {
  return getStore().onDidAnyChange(callback)
}

// Window state management helpers

/**
 * Save the current window state
 * @param {BrowserWindow} win - Electron BrowserWindow instance
 */
function saveWindowState(win) {
  if (!win) return

  const isMaximized = win.isMaximized()
  const bounds = win.getBounds()

  set('window', {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized,
  })
}

/**
 * Get saved window state for creating a new window
 * @returns {object} Window configuration object
 */
function getWindowState() {
  const windowSettings = get('window') || defaults.window
  return {
    width: windowSettings.width || defaults.window.width,
    height: windowSettings.height || defaults.window.height,
    x: windowSettings.x,
    y: windowSettings.y,
    isMaximized: windowSettings.isMaximized || false,
  }
}

/**
 * Save the last session state (view, playlist, etc.)
 * @param {object} sessionState - Session state to save
 */
function saveLastSession(sessionState) {
  set('lastSession', {
    ...get('lastSession'),
    ...sessionState,
  })
}

/**
 * Get the last session state
 * @returns {object} Last session state
 */
function getLastSession() {
  return get('lastSession') || defaults.lastSession
}

module.exports = {
  get,
  set,
  getAll,
  setAll,
  reset,
  resetAll,
  has,
  delete: deleteSetting,
  getPath,
  onDidChange,
  onDidAnyChange,
  saveWindowState,
  getWindowState,
  saveLastSession,
  getLastSession,
  defaults,
}
