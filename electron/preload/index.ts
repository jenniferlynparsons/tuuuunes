import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose Music Library API to the Renderer process ---------
contextBridge.exposeInMainWorld('api', {
  // ===== FILE OPERATIONS =====
  selectFolder: () => ipcRenderer.invoke('file:select-folder'),
  importMusic: (path: string) => ipcRenderer.invoke('file:import', path),
  scanFolder: (path: string) => ipcRenderer.invoke('file:scan-folder', path),

  // ===== DATABASE: TRACKS =====
  getTracks: (filters?: object, sort?: object) => ipcRenderer.invoke('db:get-tracks', filters, sort),
  getTrack: (trackId: number) => ipcRenderer.invoke('db:get-track', trackId),
  updateTrack: (trackId: number, updates: object) => ipcRenderer.invoke('db:update-track', trackId, updates),
  searchTracks: (query: string) => ipcRenderer.invoke('db:search-tracks', query),

  // ===== DATABASE: ALBUMS =====
  getAlbums: (filters?: object, sort?: object) => ipcRenderer.invoke('db:get-albums', filters, sort),
  getAlbumDetails: (albumTitle: string, albumArtist: string) =>
    ipcRenderer.invoke('db:get-album-details', albumTitle, albumArtist),

  // ===== DATABASE: PLAYLISTS =====
  getPlaylists: () => ipcRenderer.invoke('db:get-playlists'),
  getPlaylist: (playlistId: number) => ipcRenderer.invoke('db:get-playlist', playlistId),
  getPlaylistTracks: (playlistId: number) => ipcRenderer.invoke('db:get-playlist-tracks', playlistId),
  createPlaylist: (name: string, description?: string) => ipcRenderer.invoke('db:create-playlist', name, description),
  updatePlaylist: (playlistId: number, updates: object) => ipcRenderer.invoke('db:update-playlist', playlistId, updates),
  deletePlaylist: (playlistId: number) => ipcRenderer.invoke('db:delete-playlist', playlistId),
  addTracksToPlaylist: (playlistId: number, trackIds: number[]) =>
    ipcRenderer.invoke('db:add-tracks-to-playlist', playlistId, trackIds),
  removeTrackFromPlaylist: (playlistId: number, trackId: number) =>
    ipcRenderer.invoke('db:remove-track-from-playlist', playlistId, trackId),

  // ===== SYSTEM / LIBRARY =====
  getLibraryPath: () => ipcRenderer.invoke('app:get-library-path'),
  getLibraryStats: () => ipcRenderer.invoke('app:get-library-stats'),
  checkLibraryExists: () => ipcRenderer.invoke('app:check-library-exists'),

  // ===== EVENT LISTENERS =====
  onImportProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('import:progress', (_, data) => callback(data))
  },
  onImportComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('import:complete', (_, data) => callback(data))
  },
  onImportError: (callback: (error: string) => void) => {
    ipcRenderer.on('import:error', (_, error) => callback(error))
  },
})

// SECURITY: Raw ipcRenderer is NOT exposed to prevent bypassing context isolation.
// All renderer-to-main communication must go through the curated 'api' object above.

// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)