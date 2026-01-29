import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { dialog } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
// import { update } from './update'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

// Global instances of database and library manager
let database: any = null
let libraryManager: any = null
let settings: any = null
let MusicDatabase: any = null
let LibraryManager: any = null
let Settings: any = null
let importFolder: any = null
let scanFolder: any = null

/**
 * Lazy-load core backend modules (database, library manager, settings)
 * These don't depend on ESM modules
 */
function loadCoreModules() {
  if (MusicDatabase) return // Already loaded

  try {
    const databasePath = path.join(process.env.APP_ROOT!, 'src/main/database.js')
    const libraryManagerPath = path.join(process.env.APP_ROOT!, 'src/main/library-manager.js')
    const settingsPath = path.join(process.env.APP_ROOT!, 'src/main/settings.js')

    MusicDatabase = require(databasePath)
    LibraryManager = require(libraryManagerPath)
    Settings = require(settingsPath)

    console.log('[IPC] Core modules loaded successfully')
  } catch (error) {
    console.error('[IPC] Failed to load core modules:', error)
    throw error
  }
}

/**
 * Lazy-load import module (depends on ESM modules like music-metadata)
 * Load this only when actually needed for import operations
 */
function loadImportModules() {
  if (importFolder) return // Already loaded

  try {
    const importPath = path.join(process.env.APP_ROOT!, 'src/main/import.js')
    const importModule = require(importPath)
    importFolder = importModule.importFolder
    scanFolder = importModule.scanFolder

    console.log('[IPC] Import modules loaded successfully')
  } catch (error) {
    console.error('[IPC] Failed to load import modules:', error)
    throw error
  }
}

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.js')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

/**
 * Initialize database and library manager
 * This must be called before any IPC handlers can work
 */
function initializeBackend() {
  try {
    // Load core modules (database, library manager)
    loadCoreModules()

    // Initialize library manager
    libraryManager = new LibraryManager()

    // Create database path
    const dbPath = path.join(libraryManager.libraryPath, 'Database', 'library.db')

    // Initialize database
    database = new MusicDatabase(dbPath)
    database.initialize()

    console.log('[IPC] Backend initialized successfully')
    console.log('[IPC] Library path:', libraryManager.libraryPath)
    console.log('[IPC] Database path:', dbPath)

    return true
  } catch (error) {
    console.error('[IPC] Failed to initialize backend:', error)
    return false
  }
}

/**
 * Register all IPC handlers for the music library application
 */
function registerIPCHandlers() {
  // ===== FILE OPERATIONS =====

  /**
   * Open folder picker dialog
   */
  ipcMain.handle('file:select-folder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      })
      return result.filePaths[0] || null
    } catch (error) {
      console.error('[IPC] Error in file:select-folder:', error)
      throw error
    }
  })

  /**
   * Scan folder for audio files without importing
   */
  ipcMain.handle('file:scan-folder', async (_event, folderPath: string) => {
    try {
      if (!folderPath) {
        throw new Error('Folder path is required')
      }

      // Security: Validate path before filesystem access
      if (!libraryManager) {
        throw new Error('Library manager not initialized')
      }
      if (!libraryManager.isValidPath(folderPath)) {
        throw new Error('Access denied: invalid or restricted path')
      }

      // Load import modules on first use
      loadImportModules()
      const files = await scanFolder(folderPath)
      return files
    } catch (error) {
      console.error('[IPC] Error in file:scan-folder:', error)
      throw error
    }
  })

  /**
   * Import music files from a folder
   * Sends progress events during import
   */
  ipcMain.handle('file:import', async (event, folderPath: string) => {
    try {
      if (!database || !libraryManager) {
        throw new Error('Backend not initialized')
      }

      if (!folderPath) {
        throw new Error('Folder path is required')
      }

      // Security: Validate path before filesystem access
      if (!libraryManager.isValidPath(folderPath)) {
        throw new Error('Access denied: invalid or restricted path')
      }

      // Load import modules on first use
      loadImportModules()

      let imported = 0
      let skipped = 0
      let errors = 0

      // Progress callback sends events to renderer
      const onProgress = (processed: number, total: number, message: string, isError = false) => {
        if (isError) {
          errors++
        } else if (processed <= total) {
          imported++
        }

        event.sender.send('import:progress', {
          processed,
          total,
          message,
          imported,
          skipped,
          errors,
        })
      }

      // Run import
      const result = await importFolder(folderPath, database, libraryManager, {
        onProgress,
      })

      event.sender.send('import:complete', {
        success: true,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
      })

      return {
        success: true,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
      }
    } catch (error) {
      console.error('[IPC] Error in file:import:', error)
      event.sender.send('import:error', error instanceof Error ? error.message : String(error))
      throw error
    }
  })

  // ===== DATABASE OPERATIONS: TRACKS =====

  /**
   * Get all tracks with optional filtering and sorting
   */
  ipcMain.handle('db:get-tracks', async (_event, filters?: object, sort?: object) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      return database.getAllTracks(filters, sort)
    } catch (error) {
      console.error('[IPC] Error in db:get-tracks:', error)
      throw error
    }
  })

  /**
   * Get a single track by ID
   */
  ipcMain.handle('db:get-track', async (_event, trackId: number) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      return database.getTrack(trackId)
    } catch (error) {
      console.error('[IPC] Error in db:get-track:', error)
      throw error
    }
  })

  /**
   * Update track metadata
   */
  ipcMain.handle('db:update-track', async (_event, trackId: number, updates: object) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      database.updateTrack(trackId, updates)
    } catch (error) {
      console.error('[IPC] Error in db:update-track:', error)
      throw error
    }
  })

  /**
   * Search tracks by query
   */
  ipcMain.handle('db:search-tracks', async (_event, query: string) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      return database.searchTracks(query)
    } catch (error) {
      console.error('[IPC] Error in db:search-tracks:', error)
      throw error
    }
  })

  // ===== DATABASE OPERATIONS: ALBUMS =====

  /**
   * Get all albums with optional filtering and sorting
   */
  ipcMain.handle('db:get-albums', async (_event, filters?: object, sort?: object) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      return database.getAlbums(filters, sort)
    } catch (error) {
      console.error('[IPC] Error in db:get-albums:', error)
      throw error
    }
  })

  /**
   * Get details for a specific album
   */
  ipcMain.handle('db:get-album-details', async (_event, albumTitle: string, albumArtist: string) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      return database.getAlbumDetails(albumTitle, albumArtist)
    } catch (error) {
      console.error('[IPC] Error in db:get-album-details:', error)
      throw error
    }
  })

  // ===== DATABASE OPERATIONS: PLAYLISTS =====

  /**
   * Get all playlists
   */
  ipcMain.handle('db:get-playlists', async () => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      return database.getAllPlaylists()
    } catch (error) {
      console.error('[IPC] Error in db:get-playlists:', error)
      throw error
    }
  })

  /**
   * Get a single playlist by ID
   */
  ipcMain.handle('db:get-playlist', async (_event, playlistId: number) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      return database.getPlaylist(playlistId)
    } catch (error) {
      console.error('[IPC] Error in db:get-playlist:', error)
      throw error
    }
  })

  /**
   * Get all tracks in a playlist
   */
  ipcMain.handle('db:get-playlist-tracks', async (_event, playlistId: number) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      return database.getPlaylistTracks(playlistId)
    } catch (error) {
      console.error('[IPC] Error in db:get-playlist-tracks:', error)
      throw error
    }
  })

  /**
   * Create a new playlist
   */
  ipcMain.handle('db:create-playlist', async (_event, name: string, description?: string) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      return database.createPlaylist(name, description)
    } catch (error) {
      console.error('[IPC] Error in db:create-playlist:', error)
      throw error
    }
  })

  /**
   * Update playlist metadata
   */
  ipcMain.handle('db:update-playlist', async (_event, playlistId: number, updates: object) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      database.updatePlaylist(playlistId, updates)
    } catch (error) {
      console.error('[IPC] Error in db:update-playlist:', error)
      throw error
    }
  })

  /**
   * Delete a playlist
   */
  ipcMain.handle('db:delete-playlist', async (_event, playlistId: number) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      database.deletePlaylist(playlistId)
    } catch (error) {
      console.error('[IPC] Error in db:delete-playlist:', error)
      throw error
    }
  })

  /**
   * Add tracks to a playlist
   */
  ipcMain.handle('db:add-tracks-to-playlist', async (_event, playlistId: number, trackIds: number[]) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      database.addTracksToPlaylist(playlistId, trackIds)
    } catch (error) {
      console.error('[IPC] Error in db:add-tracks-to-playlist:', error)
      throw error
    }
  })

  /**
   * Remove a track from a playlist
   */
  ipcMain.handle('db:remove-track-from-playlist', async (_event, playlistId: number, trackId: number) => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      database.removeTrackFromPlaylist(playlistId, trackId)
    } catch (error) {
      console.error('[IPC] Error in db:remove-track-from-playlist:', error)
      throw error
    }
  })

  // ===== SYSTEM / LIBRARY OPERATIONS =====

  /**
   * Get the library folder path
   */
  ipcMain.handle('app:get-library-path', async () => {
    try {
      if (!libraryManager) {
        throw new Error('Library manager not initialized')
      }
      return libraryManager.libraryPath
    } catch (error) {
      console.error('[IPC] Error in app:get-library-path:', error)
      throw error
    }
  })

  /**
   * Get library statistics
   */
  ipcMain.handle('app:get-library-stats', async () => {
    try {
      if (!database) {
        throw new Error('Database not initialized')
      }
      return database.getLibraryStats()
    } catch (error) {
      console.error('[IPC] Error in app:get-library-stats:', error)
      throw error
    }
  })

  /**
   * Check if library exists and is accessible
   */
  ipcMain.handle('app:check-library-exists', async () => {
    try {
      if (!libraryManager) {
        throw new Error('Library manager not initialized')
      }
      return libraryManager.exists()
    } catch (error) {
      console.error('[IPC] Error in app:check-library-exists:', error)
      return false
    }
  })

  // ===== SETTINGS OPERATIONS =====

  /**
   * Get a setting by key (supports dot notation)
   */
  ipcMain.handle('settings:get', async (_event, key: string) => {
    try {
      if (!Settings) {
        throw new Error('Settings not initialized')
      }
      return Settings.get(key)
    } catch (error) {
      console.error('[IPC] Error in settings:get:', error)
      throw error
    }
  })

  /**
   * Set a setting by key
   */
  ipcMain.handle('settings:set', async (_event, key: string, value: any) => {
    try {
      if (!Settings) {
        throw new Error('Settings not initialized')
      }
      Settings.set(key, value)
      return true
    } catch (error) {
      console.error('[IPC] Error in settings:set:', error)
      throw error
    }
  })

  /**
   * Get all settings
   */
  ipcMain.handle('settings:get-all', async () => {
    try {
      if (!Settings) {
        throw new Error('Settings not initialized')
      }
      return Settings.getAll()
    } catch (error) {
      console.error('[IPC] Error in settings:get-all:', error)
      throw error
    }
  })

  /**
   * Set multiple settings at once
   */
  ipcMain.handle('settings:set-all', async (_event, settings: object) => {
    try {
      if (!Settings) {
        throw new Error('Settings not initialized')
      }
      Settings.setAll(settings)
      return true
    } catch (error) {
      console.error('[IPC] Error in settings:set-all:', error)
      throw error
    }
  })

  /**
   * Reset a setting to default
   */
  ipcMain.handle('settings:reset', async (_event, key: string) => {
    try {
      if (!Settings) {
        throw new Error('Settings not initialized')
      }
      Settings.reset(key)
      return true
    } catch (error) {
      console.error('[IPC] Error in settings:reset:', error)
      throw error
    }
  })

  /**
   * Reset all settings to defaults
   */
  ipcMain.handle('settings:reset-all', async () => {
    try {
      if (!Settings) {
        throw new Error('Settings not initialized')
      }
      Settings.resetAll()
      return true
    } catch (error) {
      console.error('[IPC] Error in settings:reset-all:', error)
      throw error
    }
  })

  /**
   * Get path to settings file
   */
  ipcMain.handle('settings:get-path', async () => {
    try {
      if (!Settings) {
        throw new Error('Settings not initialized')
      }
      return Settings.getPath()
    } catch (error) {
      console.error('[IPC] Error in settings:get-path:', error)
      throw error
    }
  })

  /**
   * Save last session state
   */
  ipcMain.handle('settings:save-session', async (_event, sessionState: object) => {
    try {
      if (!Settings) {
        throw new Error('Settings not initialized')
      }
      Settings.saveLastSession(sessionState)
      return true
    } catch (error) {
      console.error('[IPC] Error in settings:save-session:', error)
      throw error
    }
  })

  /**
   * Get last session state
   */
  ipcMain.handle('settings:get-session', async () => {
    try {
      if (!Settings) {
        throw new Error('Settings not initialized')
      }
      return Settings.getLastSession()
    } catch (error) {
      console.error('[IPC] Error in settings:get-session:', error)
      throw error
    }
  })

  console.log('[IPC] All handlers registered successfully')
}

async function createWindow() {
  // Get saved window state from settings
  const windowState = Settings ? Settings.getWindowState() : { width: 1200, height: 800 }

  win = new BrowserWindow({
    title: 'Tuuuuunes',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  // Restore maximized state if applicable
  if (windowState.isMaximized) {
    win.maximize()
  }

  // Save window state on resize/move (debounced)
  let saveStateTimeout: NodeJS.Timeout | null = null
  const saveWindowState = () => {
    if (saveStateTimeout) clearTimeout(saveStateTimeout)
    saveStateTimeout = setTimeout(() => {
      if (win && Settings) {
        Settings.saveWindowState(win)
      }
    }, 500) // Debounce 500ms
  }

  win.on('resize', saveWindowState)
  win.on('move', saveWindowState)
  win.on('maximize', saveWindowState)
  win.on('unmaximize', saveWindowState)

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto update
  // update(win)
}

app.whenReady().then(() => {
  // Initialize backend (database, library manager) before creating window
  initializeBackend()

  // Register IPC handlers
  registerIPCHandlers()

  // Create the main window
  createWindow()
})

app.on('window-all-closed', () => {
  // Save final window state before closing
  if (win && Settings) {
    Settings.saveWindowState(win)
  }
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
