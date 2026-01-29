import { app, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import type {
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater'

const { autoUpdater } = createRequire(import.meta.url)('electron-updater');

/**
 * Log update events for debugging and monitoring
 */
function logUpdateEvent(event: string, data: Record<string, unknown> = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    appVersion: app.getVersion(),
    ...data
  }
  console.log(`[UPDATE] ${event}:`, JSON.stringify(entry))
}

export function update(win: Electron.BrowserWindow) {

  // When set to false, the update download will be triggered through the API
  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.allowDowngrade = false

  // Start check - log the event
  autoUpdater.on('checking-for-update', () => {
    logUpdateEvent('checking-for-update')
  })

  // Update available
  autoUpdater.on('update-available', (arg: UpdateInfo) => {
    logUpdateEvent('update-available', {
      newVersion: arg?.version,
      releaseDate: arg?.releaseDate
    })
    win.webContents.send('update-can-available', {
      update: true,
      version: app.getVersion(),
      newVersion: arg?.version
    })
  })

  // Update not available
  autoUpdater.on('update-not-available', (arg: UpdateInfo) => {
    logUpdateEvent('update-not-available', { checkedVersion: arg?.version })
    win.webContents.send('update-can-available', {
      update: false,
      version: app.getVersion(),
      newVersion: arg?.version
    })
  })

  // Global error handler for updater
  autoUpdater.on('error', (error: Error) => {
    logUpdateEvent('error', {
      message: error.message,
      stack: error.stack
    })
    win.webContents.send('update-error', {
      message: 'Update check failed',
      error: error.message,
      timestamp: Date.now()
    })
  })

  // Checking for updates
  ipcMain.handle('check-update', async () => {
    if (!app.isPackaged) {
      const error = new Error('The update feature is only available after the package.')
      logUpdateEvent('check-update-skipped', { reason: 'not-packaged' })
      return { message: error.message, error }
    }

    try {
      logUpdateEvent('check-update-started')
      const result = await autoUpdater.checkForUpdatesAndNotify()
      logUpdateEvent('check-update-completed', {
        updateAvailable: !!result?.updateInfo?.version
      })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logUpdateEvent('check-update-failed', { error: errorMessage })
      return {
        message: `Failed to check for updates: ${errorMessage}`,
        error
      }
    }
  })

  // Start downloading and feedback on progress
  ipcMain.handle('start-download', (event: Electron.IpcMainInvokeEvent) => {
    startDownload(
      (error, progressInfo) => {
        if (error) {
          // feedback download error message
          event.sender.send('update-error', { message: error.message, error })
        } else {
          // feedback update progress message
          event.sender.send('download-progress', progressInfo)
        }
      },
      () => {
        // feedback update downloaded message
        event.sender.send('update-downloaded')
      }
    )
  })

  // Install now
  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

function startDownload(
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: (event: UpdateDownloadedEvent) => void,
) {
  logUpdateEvent('download-started')

  autoUpdater.on('download-progress', (info: ProgressInfo) => {
    logUpdateEvent('download-progress', {
      percent: info.percent?.toFixed(2),
      transferred: info.transferred,
      total: info.total,
      bytesPerSecond: info.bytesPerSecond
    })
    callback(null, info)
  })

  autoUpdater.on('error', (error: Error) => {
    logUpdateEvent('download-error', {
      message: error.message,
      stack: error.stack
    })
    callback(error, null)
  })

  autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
    logUpdateEvent('download-complete', { version: event.version })
    complete(event)
  })

  autoUpdater.downloadUpdate()
}
