# Phase 1: Foundation - Implementation Tickets

## Overview
Foundation phase establishes core infrastructure: Electron shell, database, import pipeline, testing framework, and basic UI structure. Estimated 1.5-2 weeks of development time.

---

## TICKET 1.1: Project Setup & Dependencies
**Priority:** P0 (Blocking)  
**Estimate:** 4 hours

### Description
Initialize Electron + React project with all required dependencies for music library management.

### Acceptance Criteria
- [ ] Electron app boots and displays basic window
- [ ] React renders successfully within Electron
- [ ] Development hot-reload works
- [ ] All required npm packages installed and documented

### Dependencies Required
```json
{
  "electron": "^28.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "music-metadata": "^8.1.0",
  "better-sqlite3": "^9.0.0",
  "electron-builder": "^24.0.0",
  "jest": "^29.0.0",
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.0.0"
}
```

### Technical Notes
- Use `electron-forge` or `electron-builder` for packaging
- Set up proper main/renderer process communication (IPC)
- Configure webpack/vite for React in Electron context
- Enable Node integration in renderer (needed for file access)

### Definition of Done
- App launches without errors
- Console shows no dependency warnings
- Package.json includes all core dependencies
- README includes setup instructions

---

## TICKET 1.2: Testing Framework Setup
**Priority:** P0 (Blocking)  
**Estimate:** 3 hours

### Description
Set up comprehensive testing infrastructure for both main process and renderer process code. Establish testing patterns early to support TDD/test-first development throughout the project.

### Testing Stack

**Unit Testing:**
- **Jest** - Primary test runner and assertion library
- **@testing-library/react** - React component testing
- **@testing-library/jest-dom** - Custom Jest matchers for DOM

**Test Coverage:**
- Jest built-in coverage reporting
- Aim for >80% coverage on core business logic

### Test Structure
```
src/
├── main/
│   ├── database.js
│   ├── database.test.js      ← Unit tests alongside code
│   ├── metadata.js
│   ├── metadata.test.js
│   └── import.js
│       └── import.test.js
├── renderer/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Sidebar.test.jsx
│   │   ├── PlayerBar.jsx
│   │   └── PlayerBar.test.jsx
│   └── App.test.jsx
└── tests/
    ├── integration/               ← Integration tests separate
    │   ├── import-workflow.test.js
    │   └── ipc-communication.test.js
    └── fixtures/
        ├── audio/
        │   ├── test.mp3
        │   ├── test.flac
        │   └── test.m4a
        └── metadata/
            └── sample-data.json
```

### Acceptance Criteria
- [ ] Jest configured and running
- [ ] Can test React components with Testing Library
- [ ] Can test main process code (database, file operations)
- [ ] Test fixtures directory with sample audio files
- [ ] npm script for running all tests: `npm test`
- [ ] npm script for coverage report: `npm run test:coverage`
- [ ] npm script for watch mode: `npm run test:watch`

### Configuration

**jest.config.js:**
```javascript
module.exports = {
  projects: [
    {
      displayName: 'main',
      testEnvironment: 'node',
      testMatch: ['**/src/main/**/*.test.js'],
      collectCoverageFrom: [
        'src/main/**/*.js',
        '!src/main/**/*.test.js'
      ]
    },
    {
      displayName: 'renderer',
      testEnvironment: 'jsdom',
      testMatch: ['**/src/renderer/**/*.test.jsx'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      moduleNameMapper: {
        '\\.(css|less|scss)$': 'identity-obj-proxy'
      },
      collectCoverageFrom: [
        'src/renderer/**/*.{js,jsx}',
        '!src/renderer/**/*.test.{js,jsx}'
      ]
    }
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

**package.json scripts:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Sample Test Examples

**Database Test:**
```javascript
// src/main/database.test.js
const Database = require('./database');

describe('Track Database Operations', () => {
  let db;
  
  beforeEach(() => {
    db = new Database(':memory:'); // In-memory DB for tests
    db.initialize();
  });
  
  afterEach(() => {
    db.close();
  });
  
  test('inserts track with metadata', () => {
    const track = {
      file_path: '/test/track.mp3',
      title: 'Test Track',
      artist: 'Test Artist',
      album: 'Test Album',
      date_added: Date.now()
    };
    
    const result = db.insertTrack(track);
    expect(result.track_id).toBeDefined();
    
    const retrieved = db.getTrack(result.track_id);
    expect(retrieved.title).toBe('Test Track');
  });
  
  test('handles duplicate file paths', () => {
    const track = {
      file_path: '/test/duplicate.mp3',
      title: 'Track 1',
      date_added: Date.now()
    };
    
    db.insertTrack(track);
    
    expect(() => {
      db.insertTrack(track);
    }).toThrow();
  });
});
```

**React Component Test:**
```javascript
// src/renderer/components/Sidebar.test.jsx
import { render, screen } from '@testing-library/react';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  test('renders library sections', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('LIBRARY')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
  });
  
  test('renders playlist list', () => {
    const playlists = [
      { id: 1, name: 'Favorites' },
      { id: 2, name: 'Running' }
    ];
    
    render(<Sidebar playlists={playlists} />);
    
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });
});
```

### Test Fixtures Required

**Audio Files (use Creative Commons or generate silent samples):**
- `test.mp3` - MP3 with complete ID3v2.4 tags
- `test.flac` - FLAC with Vorbis comments
- `test.m4a` - M4A with iTunes metadata
- `no-tags.mp3` - MP3 with no metadata
- `with-artwork.mp3` - MP3 with embedded album art

**Generate with ffmpeg:**
```bash
# Create 1-second silent test file
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame test.mp3
```

### Technical Notes
- Use in-memory SQLite (`:memory:`) for database tests (fast, isolated)
- Keep test audio files small (<100KB each)
- Use `beforeEach`/`afterEach` for proper test isolation
- Tests alongside code (not separate tests/ directory) for easier maintenance

### Definition of Done
- All test scripts work (`npm test`, `npm run test:coverage`)
- Example tests written and passing for at least one module
- Test fixtures directory populated with sample audio
- Coverage report generates successfully
- Documentation in README on running tests

---

## TICKET 1.3: Database Schema Design & Implementation
**Priority:** P0 (Blocking)  
**Estimate:** 6 hours

### Description
Design and implement SQLite database schema for music library with support for multiple genres per track, album artist handling, and metadata storage.

### Database Schema

#### Tables

**tracks**
```sql
CREATE TABLE tracks (
    track_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    artist TEXT,
    album TEXT,
    album_artist TEXT,
    track_number INTEGER,
    disc_number INTEGER,
    release_year INTEGER,
    duration_seconds INTEGER,
    bitrate INTEGER,
    sample_rate INTEGER,
    codec TEXT,
    file_size_bytes INTEGER,
    date_added INTEGER NOT NULL, -- Unix timestamp
    date_modified INTEGER, -- Unix timestamp
    is_compilation BOOLEAN DEFAULT 0,
    artwork_path TEXT, -- Path to cached artwork file
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_tracks_album ON tracks(album);
CREATE INDEX idx_tracks_artist ON tracks(artist);
CREATE INDEX idx_tracks_album_artist ON tracks(album_artist);
CREATE INDEX idx_tracks_date_added ON tracks(date_added);
```

**genres**
```sql
CREATE TABLE genres (
    genre_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_genres_name ON genres(name);
```

**track_genres** (Junction table)
```sql
CREATE TABLE track_genres (
    track_id INTEGER NOT NULL,
    genre_id INTEGER NOT NULL,
    PRIMARY KEY (track_id, genre_id),
    FOREIGN KEY (track_id) REFERENCES tracks(track_id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE
);

CREATE INDEX idx_track_genres_track ON track_genres(track_id);
CREATE INDEX idx_track_genres_genre ON track_genres(genre_id);
```

**playlists**
```sql
CREATE TABLE playlists (
    playlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    artwork_path TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

**playlist_tracks** (Junction table with ordering)
```sql
CREATE TABLE playlist_tracks (
    playlist_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    added_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (playlist_id, track_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks(track_id) ON DELETE CASCADE
);

CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);
```

**albums** (Cached/computed view for performance)
```sql
CREATE TABLE albums (
    album_id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_title TEXT NOT NULL,
    album_artist TEXT,
    release_year INTEGER,
    artwork_path TEXT,
    is_compilation BOOLEAN DEFAULT 0,
    track_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(album_title, album_artist)
);

CREATE INDEX idx_albums_artist ON albums(album_artist);
CREATE INDEX idx_albums_title ON albums(album_title);
```

### Acceptance Criteria
- [ ] Database file created in user's library folder
- [ ] All tables created with proper indexes
- [ ] Foreign key constraints enforced
- [ ] Database wrapper class provides basic CRUD operations
- [ ] Migration system in place for future schema changes

### Technical Notes
- Use `better-sqlite3` for synchronous, fast operations
- Store database in: `~/Library/Application Support/YourAppName/library.db` (macOS)
- Implement database backup before migrations
- Add triggers for `updated_at` timestamp automation

### Definition of Done
- Schema successfully creates on first run
- All indexes verified with EXPLAIN QUERY PLAN
- Database operations are transactional
- Unit tests pass for basic CRUD operations

---

## TICKET 1.4: File System & Library Folder Structure
**Priority:** P0 (Blocking)  
**Estimate:** 3 hours

### Description
Set up managed library folder structure where imported music files and cached artwork will be stored.

### Folder Structure
```
~/Music/YourAppName/
├── Music/                    # Copied audio files
│   ├── Artist Name/
│   │   └── Album Name/
│   │       ├── 01 Track.flac
│   │       └── 02 Track.flac
├── Artwork/                  # Cached album/playlist artwork
│   ├── albums/
│   │   └── [hash].jpg
│   └── playlists/
│       └── [hash].jpg
└── Database/
    └── library.db
```

### Acceptance Criteria
- [ ] Library folder created on first launch
- [ ] User can set custom library location in settings
- [ ] Subfolder structure created automatically
- [ ] Permissions verified (read/write access)
- [ ] Path utilities handle special characters and spaces correctly

### Technical Notes
- Use Node's `fs` module with promises
- Sanitize filenames (remove invalid characters: `/\?%*:|"<>`)
- Hash artwork files to avoid duplicates
- Store library path in preferences/settings file

### Definition of Done
- Library folder structure exists
- Files can be written to all subfolders
- Path edge cases handled (unicode, long paths, special chars)

---

## TICKET 1.5: Music Metadata Extraction
**Priority:** P0 (Blocking)  
**Estimate:** 8 hours

### Description
Implement metadata extraction from audio files (MP3, FLAC, M4A/MP4) using music-metadata library. Extract tags, artwork, and technical file information.

### Supported Formats
- MP3 (ID3v1, ID3v2.2, ID3v2.3, ID3v2.4)
- FLAC (Vorbis Comments)
- M4A/MP4 (iTunes-style atoms)

### Metadata to Extract
**Basic Tags:**
- Title
- Artist
- Album
- Album Artist
- Track Number
- Disc Number
- Genre(s) - handle multiple
- Year
- Compilation flag

**Technical Info:**
- Duration (seconds)
- Bitrate
- Sample rate
- Codec
- File size

**Artwork:**
- Embedded album art
- Extract as buffer
- Save to artwork cache with hash-based filename

### Acceptance Criteria
- [ ] Extracts all metadata fields from test files (MP3, FLAC, M4A)
- [ ] Handles missing/incomplete metadata gracefully
- [ ] Extracts and caches artwork correctly
- [ ] Reports technical file information accurately
- [ ] Handles corrupt/malformed files without crashing

### Technical Notes
```javascript
const mm = require('music-metadata');

async function extractMetadata(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    
    return {
      title: metadata.common.title || path.basename(filePath),
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      albumArtist: metadata.common.albumartist || metadata.common.artist,
      trackNumber: metadata.common.track?.no || null,
      discNumber: metadata.common.disk?.no || null,
      genres: metadata.common.genre || [],
      year: metadata.common.year || null,
      duration: metadata.format.duration || 0,
      bitrate: metadata.format.bitrate || null,
      sampleRate: metadata.format.sampleRate || null,
      codec: metadata.format.codec || null,
      artwork: metadata.common.picture?.[0] || null,
      isCompilation: metadata.common.compilation || false
    };
  } catch (error) {
    console.error(`Failed to extract metadata from ${filePath}:`, error);
    return null;
  }
}
```

### Edge Cases to Handle
- Files with no metadata (use filename parsing)
- Multiple artists (store as single string, comma-separated)
- Multiple embedded artworks (take first/largest)
- Very large artwork files (resize if > 1MB)
- Non-standard tag encodings

### Definition of Done
- Unit tests pass for all supported formats
- Handles edge cases gracefully
- Performance acceptable (<100ms per file average)
- Artwork extraction works reliably

---

## TICKET 1.6: File Import Pipeline
**Priority:** P1 (Core feature)  
**Estimate:** 10 hours

### Description
Build complete import pipeline: folder scanning, file copying, metadata extraction, database insertion, and progress tracking.

### Import Flow
1. User selects folder(s) via file picker or drag-and-drop
2. Recursively scan for audio files (.mp3, .flac, .m4a)
3. Extract metadata from each file
4. Copy file to managed library location
5. Cache artwork if present
6. Insert track record into database
7. Update UI with progress

### Acceptance Criteria
- [ ] Recursive folder scanning works
- [ ] Filters for supported file types only
- [ ] Shows progress indicator (files processed / total)
- [ ] Handles duplicate files (skip or rename)
- [ ] Updates library view in real-time as files import
- [ ] Cancellable import process
- [ ] Error handling for read/write failures

### Technical Implementation

**File Scanner:**
```javascript
async function scanFolder(folderPath) {
  const audioFiles = [];
  const supportedExtensions = ['.mp3', '.flac', '.m4a', '.mp4'];
  
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          audioFiles.push(fullPath);
        }
      }
    }
  }
  
  await walk(folderPath);
  return audioFiles;
}
```

**Import Process:**
```javascript
async function importFiles(filePaths, onProgress) {
  const total = filePaths.length;
  let processed = 0;
  
  for (const filePath of filePaths) {
    try {
      // Extract metadata
      const metadata = await extractMetadata(filePath);
      if (!metadata) {
        processed++;
        onProgress(processed, total, `Skipped: ${filePath}`);
        continue;
      }
      
      // Generate destination path
      const destPath = generateLibraryPath(metadata);
      
      // Copy file to library
      await fs.copyFile(filePath, destPath);
      
      // Cache artwork if present
      let artworkPath = null;
      if (metadata.artwork) {
        artworkPath = await cacheArtwork(metadata.artwork);
      }
      
      // Insert into database
      await db.insertTrack({
        ...metadata,
        file_path: destPath,
        artwork_path: artworkPath,
        date_added: Date.now()
      });
      
      processed++;
      onProgress(processed, total, `Imported: ${metadata.title}`);
      
    } catch (error) {
      console.error(`Import failed for ${filePath}:`, error);
      processed++;
      onProgress(processed, total, `Error: ${filePath}`);
    }
  }
}
```

### Duplicate Handling Strategy
- Check if file_path already exists in database
- If duplicate: Skip and log
- Future enhancement: Check by audio fingerprint

### Definition of Done
- Can import folder of 100+ files successfully
- Progress updates work smoothly
- No memory leaks during large imports
- Error recovery works (import continues after failures)
- Imported files appear in library view

---

## TICKET 1.7: Basic React UI Shell
**Priority:** P1 (Core feature)  
**Estimate:** 8 hours

### Description
Build foundational UI structure matching iTunes 11 architecture with iTunes 12 visual style: player bar at top, sidebar navigation, and main content area.

### UI Layout Structure
```
┌─────────────────────────────────────────────────┐
│ Player Bar: [◀] [▶] ━━━━━●━━━━━━ 2:34 / 4:12   │
│ Now Playing: Track - Artist                     │
├─────────────────────────────────────────────────┤
│ Sidebar         │ Main Content Area             │
│                 │                                │
│ LIBRARY         │                                │
│ • Music         │   [Active View - Library/     │
│ • Playlists     │    Album Gallery/Playlist]     │
│                 │                                │
│ PLAYLISTS       │                                │
│ • Playlist 1    │                                │
│ • Playlist 2    │                                │
│                 │                                │
└─────────────────────────────────────────────────┘
```

### Component Structure
```
App
├── PlayerBar (top, fixed)
│   ├── PlaybackControls
│   ├── ProgressBar
│   └── NowPlayingInfo
├── MainLayout
│   ├── Sidebar
│   │   ├── LibrarySection
│   │   └── PlaylistsList
│   └── MainContent
│       ├── LibraryView (conditional)
│       ├── AlbumGalleryView (conditional)
│       └── PlaylistView (conditional)
```

### Acceptance Criteria
- [ ] Three-panel layout renders correctly
- [ ] Sidebar shows library sections and playlists
- [ ] Main content area switches between views
- [ ] Player bar fixed at top
- [ ] Responsive to window resizing
- [ ] Matches iTunes 12 dark theme aesthetic

### Visual Style (iTunes 12 Dark Theme)
- Background: `#1e1e1e` (main), `#252525` (sidebar)
- Text: `#ffffff` (primary), `#a0a0a0` (secondary)
- Accent: `#0a84ff` (Apple blue for selections)
- Borders: `#3a3a3a`
- Font: System font (San Francisco on macOS)

### Technical Notes
- Use CSS Grid for main layout
- Sidebar: 200px fixed width
- Player bar: 80px fixed height
- Main content: flexible, scrollable
- Use React Context for view switching state

### Definition of Done
- Layout works at multiple window sizes
- Dark theme applied consistently
- Navigation between views works
- Visual hierarchy clear and readable

---

## TICKET 1.8: Electron IPC Communication Setup
**Priority:** P0 (Blocking)  
**Estimate:** 4 hours

### Description
Set up IPC (Inter-Process Communication) between Electron's main process and renderer process for file operations, database access, and system dialogs.

### IPC Channels Required

**File Operations:**
- `file:select-folder` - Open folder picker dialog
- `file:import` - Start import process
- `file:get-artwork` - Retrieve artwork file

**Database Operations:**
- `db:get-tracks` - Fetch tracks (with filters/sorting)
- `db:get-albums` - Fetch album list
- `db:get-playlists` - Fetch playlists
- `db:update-track` - Update track metadata
- `db:create-playlist` - Create new playlist

**System:**
- `app:get-library-path` - Get library folder location
- `app:set-library-path` - Change library location

### Acceptance Criteria
- [ ] Main process handlers registered for all channels
- [ ] Renderer process can invoke all IPC calls
- [ ] Error handling for failed IPC calls
- [ ] Type-safe IPC wrapper functions
- [ ] Security: contextIsolation enabled

### Technical Implementation

**Main Process (main.js):**
```javascript
const { ipcMain, dialog } = require('electron');

// File picker
ipcMain.handle('file:select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

// Import files
ipcMain.handle('file:import', async (event, folderPath) => {
  const files = await scanFolder(folderPath);
  return await importFiles(files, (progress) => {
    event.sender.send('import:progress', progress);
  });
});

// Database queries
ipcMain.handle('db:get-tracks', async (event, filters) => {
  return await database.getTracks(filters);
});
```

**Renderer Process (preload.js):**
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('file:select-folder'),
  importMusic: (path) => ipcRenderer.invoke('file:import', path),
  getTracks: (filters) => ipcRenderer.invoke('db:get-tracks', filters),
  onImportProgress: (callback) => {
    ipcRenderer.on('import:progress', (_, data) => callback(data));
  }
});
```

### Definition of Done
- All IPC channels working bidirectionally
- Renderer can successfully call main process functions
- Events stream from main to renderer (progress updates)
- No console errors related to IPC

---

## TICKET 1.9: Settings & Preferences System
**Priority:** P2 (Nice to have)  
**Estimate:** 4 hours

### Description
Implement user preferences/settings storage for application configuration.

### Settings to Store
- Library folder location
- Import preferences (copy vs reference - V1 only supports copy)
- UI preferences (theme, view mode defaults)
- Window size/position
- Last selected view/playlist

### Storage Method
Use `electron-store` for JSON-based settings file:
- Location: `~/Library/Application Support/YourAppName/config.json`
- Automatic saving on change
- Type-safe schema

### Acceptance Criteria
- [ ] Settings persist across app restarts
- [ ] Settings accessible from both main and renderer processes
- [ ] Default settings applied on first launch
- [ ] Settings UI panel (can be basic for V1)

### Definition of Done
- Settings save and load correctly
- First launch creates default settings
- Changes apply immediately in app

---

## Phase 1 Summary

### Total Estimated Time: 50 hours (~1.5-2 weeks)

### Critical Path
1. Project Setup (1.1)
2. Testing Framework (1.2) - Enables TDD for remaining tickets
3. Database Schema (1.3)
4. Metadata Extraction (1.5)
5. Import Pipeline (1.6)
6. UI Shell (1.7)

### Deliverables
✅ Working Electron application  
✅ Comprehensive testing infrastructure  
✅ SQLite database with proper schema  
✅ Music import functionality  
✅ Basic three-panel UI layout  
✅ File system structure established  
✅ IPC communication working  

### What's NOT in Phase 1
- Playback functionality (Phase 2)
- View implementations beyond basic shell (Phase 3)
- EQ (Phase 4)
- Metadata editing (Phase 4)

---

## Testing Checklist

### Import Testing
- [ ] Import single file
- [ ] Import folder with 10 files
- [ ] Import folder with 100+ files
- [ ] Import folder with nested subfolders
- [ ] Import files with missing metadata
- [ ] Import files with unicode characters in names
- [ ] Cancel import mid-process

### Database Testing
- [ ] Insert 1000+ tracks
- [ ] Query tracks by artist
- [ ] Query tracks by album
- [ ] Handle duplicate file paths
- [ ] Multiple genres per track

### UI Testing
- [ ] Window resizing
- [ ] View switching
- [ ] Sidebar navigation
- [ ] Dark theme renders correctly

### Cross-Format Testing
Test with actual files:
- [ ] MP3 with ID3v2.3
- [ ] MP3 with ID3v2.4
- [ ] FLAC with Vorbis comments
- [ ] M4A with iTunes metadata
- [ ] Files with embedded artwork
- [ ] Files without embedded artwork