/// <reference types="vite/client" />

// ===== Data Type Definitions =====

interface Track {
  track_id: number
  file_path: string
  title: string
  artist?: string
  album?: string
  album_artist?: string
  track_number?: number
  disc_number?: number
  release_year?: number
  duration_seconds?: number
  bitrate?: number
  sample_rate?: number
  codec?: string
  file_size_bytes?: number
  date_added: number
  date_modified?: number
  is_compilation?: boolean
  artwork_path?: string
  created_at?: number
  updated_at?: number
}

interface Album {
  album_id: number
  album_title: string
  album_artist?: string
  release_year?: number
  artwork_path?: string
  is_compilation?: boolean
  track_count?: number
  created_at?: number
}

interface AlbumDetails extends Album {
  tracks?: Track[]
}

interface Playlist {
  playlist_id: number
  name: string
  description?: string
  artwork_path?: string
  created_at?: number
  updated_at?: number
}

interface LibraryStats {
  total_tracks: number
  total_albums: number
  total_playlists: number
  total_artists: number
  total_genres: number
  library_size_bytes: number
}

interface ImportProgress {
  processed: number
  total: number
  message: string
  imported: number
  skipped: number
  errors: number
}

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: number
}

interface ElectronAPI {
  // ===== FILE OPERATIONS =====
  selectFolder: () => Promise<string | null>
  importMusic: (path: string) => Promise<ImportResult>
  scanFolder: (path: string) => Promise<string[]>

  // ===== DATABASE: TRACKS =====
  getTracks: (filters?: object, sort?: object) => Promise<Track[]>
  getTrack: (trackId: number) => Promise<Track | null>
  updateTrack: (trackId: number, updates: object) => Promise<void>
  searchTracks: (query: string) => Promise<Track[]>

  // ===== DATABASE: ALBUMS =====
  getAlbums: (filters?: object, sort?: object) => Promise<Album[]>
  getAlbumDetails: (albumTitle: string, albumArtist: string) => Promise<AlbumDetails | null>

  // ===== DATABASE: PLAYLISTS =====
  getPlaylists: () => Promise<Playlist[]>
  getPlaylist: (playlistId: number) => Promise<Playlist | null>
  getPlaylistTracks: (playlistId: number) => Promise<Track[]>
  createPlaylist: (name: string, description?: string) => Promise<{ playlist_id: number }>
  updatePlaylist: (playlistId: number, updates: object) => Promise<void>
  deletePlaylist: (playlistId: number) => Promise<void>
  addTracksToPlaylist: (playlistId: number, trackIds: number[]) => Promise<void>
  removeTrackFromPlaylist: (playlistId: number, trackId: number) => Promise<void>

  // ===== SYSTEM / LIBRARY =====
  getLibraryPath: () => Promise<string>
  getLibraryStats: () => Promise<LibraryStats>
  checkLibraryExists: () => Promise<boolean>

  // ===== EVENT LISTENERS =====
  onImportProgress: (callback: (data: ImportProgress) => void) => void
  onImportComplete: (callback: (data: ImportResult) => void) => void
  onImportError: (callback: (error: string) => void) => void
}

interface Window {
  // Structured music library API (recommended)
  api: ElectronAPI

  // Generic IPC renderer (for backward compatibility)
  ipcRenderer: import('electron').IpcRenderer
}
