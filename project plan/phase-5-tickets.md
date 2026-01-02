# Phase 5: Edge Cases & Optimization - Implementation Tickets

## Overview
Phase 5 addresses performance optimization, edge case handling, error recovery, and production readiness. This phase ensures the app is stable, fast, and handles real-world usage scenarios. Estimated 1-2 weeks of development time.

---

## TICKET 5.1: Performance Optimization for Large Libraries
**Priority:** P0 (Blocking)  
**Estimate:** 8 hours

### Description
Optimize database queries, UI rendering, and memory usage for libraries with 10,000+ tracks.

### Database Optimization

**Index Analysis:**
```sql
-- Analyze query performance
EXPLAIN QUERY PLAN
SELECT * FROM tracks 
WHERE artist = 'The Beatles'
ORDER BY album, track_number;

-- Add missing indexes based on common queries
CREATE INDEX IF NOT EXISTS idx_tracks_compilation ON tracks(is_compilation);
CREATE INDEX IF NOT EXISTS idx_tracks_year ON tracks(release_year);
```

**Query Optimization:**
```javascript
// Bad: Loading all tracks at once
const allTracks = await db.all('SELECT * FROM tracks');

// Good: Pagination and lazy loading
const BATCH_SIZE = 100;
const getTracks = (offset = 0) => {
  return db.all(
    'SELECT * FROM tracks ORDER BY artist, album, track_number LIMIT ? OFFSET ?',
    [BATCH_SIZE, offset]
  );
};
```

**Prepared Statements:**
```javascript
class Database {
  constructor() {
    // Prepare commonly used queries
    this.getTrackStmt = db.prepare('SELECT * FROM tracks WHERE track_id = ?');
    this.getAlbumTracksStmt = db.prepare(
      'SELECT * FROM tracks WHERE album = ? AND album_artist = ? ORDER BY disc_number, track_number'
    );
  }
  
  getTrack(trackId) {
    return this.getTrackStmt.get(trackId);
  }
  
  getAlbumTracks(album, albumArtist) {
    return this.getAlbumTracksStmt.all(album, albumArtist);
  }
}
```

### UI Rendering Optimization

**Virtual Scrolling:**
Already using `react-window`, but optimize further:
```jsx
import { VariableSizeList } from 'react-window';

function LibraryView({ tracks }) {
  const getItemSize = (index) => {
    // Different heights for headers vs. regular rows
    return tracks[index].isHeader ? 40 : 32;
  };
  
  return (
    <VariableSizeList
      height={window.innerHeight - 160}
      itemCount={tracks.length}
      itemSize={getItemSize}
      width="100%"
      overscanCount={5} // Render 5 extra items above/below viewport
    >
      {Row}
    </VariableSizeList>
  );
}
```

**Memoization:**
```jsx
import { memo, useMemo } from 'react';

// Memoize expensive components
const TrackRow = memo(({ track, onClick }) => {
  return (
    <tr onClick={onClick}>
      <td>{track.title}</td>
      <td>{track.artist}</td>
      {/* ... */}
    </tr>
  );
}, (prevProps, nextProps) => {
  // Only re-render if track changed
  return prevProps.track.track_id === nextProps.track.track_id;
});

// Memoize expensive computations
function LibraryView({ tracks }) {
  const sortedTracks = useMemo(() => {
    return tracks.sort((a, b) => {
      // Expensive sorting logic
    });
  }, [tracks]);
  
  return <VirtualList data={sortedTracks} />;
}
```

**Debouncing & Throttling:**
```javascript
import { debounce, throttle } from 'lodash';

// Debounce search (wait for user to stop typing)
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);

// Throttle scroll events (limit rate)
const throttledScroll = throttle((event) => {
  handleScroll(event);
}, 100);
```

### Memory Management

**Image Loading:**
```javascript
class ImageCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  get(path) {
    return this.cache.get(path);
  }
  
  set(path, imageData) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(path, imageData);
  }
  
  clear() {
    this.cache.clear();
  }
}

const artworkCache = new ImageCache(200);
```

**Cleanup on Unmount:**
```jsx
useEffect(() => {
  const interval = setInterval(updateTime, 1000);
  
  return () => {
    clearInterval(interval);
    // Clean up any event listeners, timers, etc.
  };
}, []);
```

### Acceptance Criteria
- [ ] Library with 10,000 tracks loads < 2 seconds
- [ ] Scrolling 60fps smooth
- [ ] Search results < 200ms
- [ ] Memory usage stable (no leaks)
- [ ] Album artwork loads efficiently
- [ ] Database queries < 50ms average

### Performance Benchmarks
```javascript
// Benchmark key operations
console.time('Load Library');
const tracks = await loadAllTracks();
console.timeEnd('Load Library');
// Target: < 2000ms for 10k tracks

console.time('Search');
const results = await searchTracks('beatles');
console.timeEnd('Search');
// Target: < 200ms

console.time('Album Load');
const album = await loadAlbumTracks(albumId);
console.timeEnd('Album Load');
// Target: < 100ms
```

### Definition of Done
- Performance targets met
- No memory leaks detected
- Smooth UI at 10k+ tracks
- Optimizations tested and verified

---

## TICKET 5.2: Error Handling & Recovery
**Priority:** P0 (Blocking)  
**Estimate:** 6 hours

### Description
Comprehensive error handling for file operations, database errors, playback failures, and network issues.

### Error Categories

**1. File System Errors**
```javascript
async function loadAudioFile(filePath) {
  try {
    const file = await fs.readFile(filePath);
    return file;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File not found - track moved or deleted
      await handleMissingFile(filePath);
    } else if (error.code === 'EACCES') {
      // Permission denied
      showError('Cannot access file - check permissions');
    } else {
      // Other file errors
      logger.error('File load error:', error);
      showError('Failed to load audio file');
    }
    return null;
  }
}

async function handleMissingFile(filePath) {
  // Mark track as missing in database
  await db.run('UPDATE tracks SET is_missing = 1 WHERE file_path = ?', filePath);
  
  // Show notification
  showToast('Track file not found - it may have been moved or deleted', 'warning');
  
  // Offer to relocate
  const relocate = await showDialog({
    title: 'Missing File',
    message: 'Would you like to locate this file?',
    buttons: ['Locate', 'Remove from Library', 'Cancel']
  });
  
  if (relocate === 'Locate') {
    const newPath = await selectFile();
    if (newPath) {
      await db.run('UPDATE tracks SET file_path = ?, is_missing = 0 WHERE file_path = ?', 
                   [newPath, filePath]);
    }
  } else if (relocate === 'Remove from Library') {
    await db.run('DELETE FROM tracks WHERE file_path = ?', filePath);
  }
}
```

**2. Database Errors**
```javascript
function executeWithRetry(query, params, maxRetries = 3) {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      return db.prepare(query).run(params);
    } catch (error) {
      attempts++;
      
      if (error.code === 'SQLITE_BUSY') {
        // Database locked - retry after delay
        await sleep(100 * attempts);
        continue;
      } else if (error.code === 'SQLITE_CORRUPT') {
        // Database corrupted - restore from backup
        await restoreDatabaseBackup();
        showError('Database restored from backup');
        return null;
      } else {
        // Unrecoverable error
        logger.error('Database error:', error);
        throw error;
      }
    }
  }
  
  throw new Error('Max retry attempts exceeded');
}
```

**3. Playback Errors**
```javascript
class AudioEngine {
  async loadTrack(filePath) {
    try {
      const response = await fetch(`file://${filePath}`);
      
      if (!response.ok) {
        throw new Error('File not accessible');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.currentTrack = {
        buffer: audioBuffer,
        filePath: filePath,
        duration: audioBuffer.duration
      };
      
      return this.currentTrack;
      
    } catch (error) {
      if (error.name === 'EncodingError') {
        // Unsupported codec or corrupted file
        showError('Cannot play this audio file - unsupported format or corrupted');
        this.skipToNext();
      } else {
        logger.error('Audio decode error:', error);
        showError('Failed to load audio');
        this.skipToNext();
      }
      
      return null;
    }
  }
  
  play() {
    try {
      // Attempt playback
      this.sourceNode.start(0, this.pauseTime);
      this.isPlaying = true;
    } catch (error) {
      if (error.name === 'InvalidStateError') {
        // AudioContext suspended (usually by browser autoplay policy)
        this.audioContext.resume().then(() => {
          this.play(); // Retry
        });
      } else {
        logger.error('Playback error:', error);
        showError('Playback failed');
      }
    }
  }
}
```

**4. Import Errors**
```javascript
async function importFiles(filePaths, onProgress) {
  const errors = [];
  
  for (const filePath of filePaths) {
    try {
      await importSingleFile(filePath, onProgress);
    } catch (error) {
      errors.push({
        file: filePath,
        error: error.message
      });
      
      // Continue with next file
      continue;
    }
  }
  
  if (errors.length > 0) {
    // Show error summary
    showImportErrorReport(errors);
  }
}

function showImportErrorReport(errors) {
  const report = `
    Import completed with ${errors.length} error(s):
    
    ${errors.map(e => `• ${path.basename(e.file)}: ${e.error}`).join('\n')}
  `;
  
  showDialog({
    title: 'Import Report',
    message: report,
    buttons: ['OK']
  });
}
```

### Global Error Handler
```javascript
// Main process
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  
  // Show error dialog
  dialog.showErrorBox(
    'Unexpected Error',
    'An unexpected error occurred. The application will continue running, but some features may not work correctly.'
  );
});

// Renderer process
window.addEventListener('error', (event) => {
  logger.error('Renderer error:', event.error);
  showToast('An error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason);
  showToast('An operation failed', 'error');
});
```

### Logging System
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(app.getPath('logs'), 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(app.getPath('logs'), 'combined.log') 
    })
  ]
});

// In development, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### Acceptance Criteria
- [ ] All errors caught and logged
- [ ] User-friendly error messages
- [ ] Graceful degradation (app doesn't crash)
- [ ] Missing files handled
- [ ] Corrupted files skipped
- [ ] Database errors recoverable
- [ ] Playback errors skip to next track
- [ ] Error log file created

### Definition of Done
- Error handling comprehensive
- App stable under error conditions
- Error logs useful for debugging
- User experience smooth despite errors

---

## TICKET 5.3: Database Backup & Migration
**Priority:** P1 (Core feature)  
**Estimate:** 5 hours

### Description
Automatic database backups and migration system for schema updates.

### Automatic Backups
```javascript
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // Daily
const MAX_BACKUPS = 7; // Keep last 7 backups

async function createDatabaseBackup() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(
    app.getPath('userData'),
    'backups',
    `library-${timestamp}.db`
  );
  
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.copyFile(getDatabasePath(), backupPath);
  
  // Clean old backups
  await cleanOldBackups();
  
  logger.info('Database backup created:', backupPath);
}

async function cleanOldBackups() {
  const backupDir = path.join(app.getPath('userData'), 'backups');
  const files = await fs.readdir(backupDir);
  
  const backups = files
    .filter(f => f.startsWith('library-'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtime
    }))
    .sort((a, b) => b.time - a.time);
  
  // Remove old backups beyond MAX_BACKUPS
  for (let i = MAX_BACKUPS; i < backups.length; i++) {
    await fs.unlink(backups[i].path);
  }
}

// Schedule automatic backups
setInterval(createDatabaseBackup, BACKUP_INTERVAL);
```

### Schema Migration System
```javascript
const CURRENT_SCHEMA_VERSION = 2;

async function migrateDatabase() {
  const currentVersion = await getDatabaseVersion();
  
  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    logger.info(`Migrating database from v${currentVersion} to v${CURRENT_SCHEMA_VERSION}`);
    
    // Create backup before migration
    await createDatabaseBackup();
    
    for (let v = currentVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
      await applyMigration(v);
    }
    
    await setDatabaseVersion(CURRENT_SCHEMA_VERSION);
    logger.info('Database migration complete');
  }
}

async function applyMigration(version) {
  logger.info(`Applying migration v${version}`);
  
  const migrations = {
    1: async (db) => {
      // Initial schema (already exists)
    },
    2: async (db) => {
      // Add play count support (example V2 feature)
      db.exec(`
        CREATE TABLE IF NOT EXISTS playback_stats (
          track_id INTEGER PRIMARY KEY,
          play_count INTEGER DEFAULT 0,
          last_played INTEGER,
          skip_count INTEGER DEFAULT 0,
          FOREIGN KEY (track_id) REFERENCES tracks(track_id) ON DELETE CASCADE
        );
      `);
    }
  };
  
  try {
    await migrations[version](db);
  } catch (error) {
    logger.error(`Migration v${version} failed:`, error);
    
    // Restore from backup
    await restoreDatabaseBackup();
    throw error;
  }
}

async function getDatabaseVersion() {
  try {
    const result = db.prepare('SELECT version FROM schema_version').get();
    return result ? result.version : 0;
  } catch (error) {
    // schema_version table doesn't exist (v0)
    db.exec('CREATE TABLE schema_version (version INTEGER)');
    db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
    return 0;
  }
}

async function setDatabaseVersion(version) {
  db.prepare('UPDATE schema_version SET version = ?').run(version);
}
```

### Restore from Backup
```javascript
async function restoreDatabaseBackup(backupPath = null) {
  if (!backupPath) {
    // Get most recent backup
    const backups = await getAvailableBackups();
    backupPath = backups[0].path;
  }
  
  const dbPath = getDatabasePath();
  
  // Close current database
  db.close();
  
  // Copy backup to database location
  await fs.copyFile(backupPath, dbPath);
  
  // Reopen database
  db = new Database(dbPath);
  
  logger.info('Database restored from backup:', backupPath);
}

async function getAvailableBackups() {
  const backupDir = path.join(app.getPath('userData'), 'backups');
  const files = await fs.readdir(backupDir);
  
  return files
    .filter(f => f.startsWith('library-'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtime
    }))
    .sort((a, b) => b.time - a.time);
}
```

### Acceptance Criteria
- [ ] Daily automatic backups
- [ ] Manual backup option
- [ ] Keep last 7 backups
- [ ] Schema migration system works
- [ ] Restore from backup works
- [ ] Migration errors rollback

### Definition of Done
- Backups created automatically
- Migration system tested
- Restore functionality works
- User data protected

---

## TICKET 5.4: Edge Case Testing & Fixes
**Priority:** P1 (Core feature)  
**Estimate:** 8 hours

### Description
Test and fix edge cases discovered during development and real-world usage.

### Edge Cases to Test

**1. Empty States**
- Empty library (no tracks)
- Empty queue
- Empty playlist
- No search results
- No albums
- No genres

**2. Boundary Conditions**
- Single track in library
- Single track in queue
- Very long track names (>200 chars)
- Very long album/artist names
- Track with no metadata
- Album with single track
- Playlist with single track

**3. Special Characters**
- Unicode in track names
- Emoji in metadata
- Special characters in filenames
- Quotes, apostrophes in text
- Leading/trailing whitespace

**4. Large Values**
- Track > 1 hour duration
- Album with 100+ tracks
- Artist with 1000+ tracks
- Playlist with 5000+ tracks
- Genre with 10,000+ tracks

**5. Rapid Actions**
- Rapid skip through tracks
- Spam play/pause
- Quick playlist create/delete
- Fast search typing
- Rapid view switching

**6. Concurrent Operations**
- Import while playing
- Edit metadata while playing
- Delete track while in queue
- Modify playlist while playing from it

### Test Implementation
```javascript
describe('Edge Cases', () => {
  test('handles empty library gracefully', async () => {
    const tracks = await getTracks();
    expect(tracks).toEqual([]);
    
    // UI should show empty state, not crash
    const libraryView = render(<LibraryView tracks={tracks} />);
    expect(libraryView.getByText('No music in library')).toBeInTheDocument();
  });
  
  test('handles track with no metadata', async () => {
    const track = {
      track_id: 1,
      file_path: '/test/track.mp3',
      title: null,
      artist: null,
      album: null
    };
    
    const formatted = formatTrack(track);
    expect(formatted.title).toBe('Unknown Track');
    expect(formatted.artist).toBe('Unknown Artist');
  });
  
  test('handles very long track names', () => {
    const longName = 'A'.repeat(500);
    const truncated = truncateTrackName(longName, 200);
    expect(truncated.length).toBeLessThanOrEqual(200);
    expect(truncated.endsWith('...')).toBe(true);
  });
  
  test('handles rapid skip through queue', async () => {
    const queue = generateTestTracks(100);
    setQueue(queue);
    
    // Skip through 50 tracks rapidly
    for (let i = 0; i < 50; i++) {
      await nextTrack();
    }
    
    expect(getCurrentTrackIndex()).toBe(50);
    expect(isPlaying()).toBe(true);
  });
});
```

### Fixes to Implement
```javascript
// Fix: Prevent negative queue index
function previousTrack() {
  const newIndex = Math.max(0, currentIndex - 1);
  setCurrentIndex(newIndex);
}

// Fix: Handle division by zero
function getProgressPercent() {
  if (duration === 0) return 0;
  return (currentTime / duration) * 100;
}

// Fix: Sanitize user input
function createPlaylist(name) {
  const sanitized = name.trim().substring(0, 200);
  if (!sanitized) {
    throw new Error('Playlist name cannot be empty');
  }
  return db.prepare('INSERT INTO playlists (name) VALUES (?)').run(sanitized);
}

// Fix: Handle concurrent modifications
let isImporting = false;

async function importMusic(path) {
  if (isImporting) {
    showToast('Import already in progress', 'warning');
    return;
  }
  
  isImporting = true;
  try {
    await performImport(path);
  } finally {
    isImporting = false;
  }
}
```

### Acceptance Criteria
- [ ] All empty states handled
- [ ] Boundary conditions safe
- [ ] Special characters work
- [ ] Large values don't crash
- [ ] Rapid actions don't cause errors
- [ ] Concurrent operations safe

### Definition of Done
- Edge cases tested
- Fixes implemented
- Regression tests added
- App stable under stress

---

## TICKET 5.5: Packaging & Distribution
**Priority:** P0 (Blocking)  
**Estimate:** 6 hours

### Description
Package app for macOS distribution with proper signing and auto-update support.

### Electron Builder Configuration
```javascript
// electron-builder.json
{
  "appId": "com.yourname.music-player",
  "productName": "Music Player",
  "copyright": "Copyright © 2026",
  "directories": {
    "output": "dist",
    "buildResources": "build"
  },
  "files": [
    "src/**/*",
    "package.json",
    "!node_modules/**/*",
    "node_modules/better-sqlite3/**/*",
    "node_modules/music-metadata/**/*"
  ],
  "mac": {
    "category": "public.app-category.music",
    "icon": "build/icon.icns",
    "target": [
      "dmg",
      "zip"
    ],
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  },
  "dmg": {
    "contents": [
      {
        "x": 130,
        "y": 220
      },
      {
        "x": 410,
        "y": 220,
        "type": "link",
        "path": "/Applications"
      }
    ],
    "window": {
      "width": 540,
      "height": 380
    }
  }
}
```

### Build Scripts
```json
{
  "scripts": {
    "build": "electron-builder build --mac",
    "build:dir": "electron-builder build --mac --dir",
    "dist": "npm run build"
  }
}
```

### App Icon
- Create icon.png (1024x1024)
- Convert to .icns for macOS
- Add to build/icon.icns

### Code Signing (Optional for V1)
```bash
# Will require Apple Developer account
electron-builder build --mac --publish never
```

### Acceptance Criteria
- [ ] App builds successfully
- [ ] DMG installer created
- [ ] App runs on clean macOS
- [ ] Icon displays correctly
- [ ] First launch creates library folder
- [ ] Settings persist

### Definition of Done
- Distributable DMG created
- Installation tested
- App runs independently

---

## Phase 5 Summary

### Total Estimated Time: 33 hours (~1-2 weeks)

### Critical Path
1. Performance Optimization (5.1)
2. Error Handling (5.2)
3. Packaging (5.5)

### Deliverables
✅ Optimized for 10k+ track libraries  
✅ Comprehensive error handling  
✅ Automatic database backups  
✅ Schema migration system  
✅ Edge cases handled  
✅ macOS app package (DMG)  

### Production Readiness Checklist
- [ ] Performance benchmarks met
- [ ] No memory leaks
- [ ] Error handling comprehensive
- [ ] Logging system in place
- [ ] Database backups automatic
- [ ] Migration system tested
- [ ] Edge cases fixed
- [ ] App packaged for distribution
- [ ] Installation tested
- [ ] User documentation written

---

## Testing Checklist

### Performance Testing
- [ ] Library load < 2s (10k tracks)
- [ ] Search < 200ms
- [ ] Scroll smooth 60fps
- [ ] No memory leaks
- [ ] Artwork loads efficiently

### Error Testing
- [ ] Missing files handled
- [ ] Corrupted files skipped
- [ ] Database errors recovered
- [ ] Playback errors skip
- [ ] Import errors logged

### Edge Case Testing
- [ ] Empty states work
- [ ] Boundary conditions safe
- [ ] Special characters OK
- [ ] Large values handled
- [ ] Rapid actions stable

### Distribution Testing
- [ ] DMG installs correctly
- [ ] App launches on fresh macOS
- [ ] Library created on first run
- [ ] Settings persist
