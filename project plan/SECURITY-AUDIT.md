# Security Audit - OWASP Vulnerability Review

**Date:** January 2026
**Project:** iTunes 11 Revival (tuuuuunes)
**Status:** Phase 1 - Foundation
**Scope:** Main process, IPC communication, database operations, file handling

---

## Executive Summary

The codebase demonstrates solid architectural decisions (context isolation, parameterized queries, async I/O) but contains **three high-priority vulnerabilities** that should be addressed before moving to Phase 2. All findings are fixable without architectural redesign.

**High-Risk Areas:**
- SQL injection in sort parameters
- Overly permissive IPC exposure
- Path traversal in import handlers

**Recommendation:** Fix high-priority issues in Phase 1 before expanding feature set.

---

## Vulnerability Details

### 🔴 HIGH PRIORITY

#### 1. SQL Injection in Sort Parameters
**OWASP A03:2021 - Injection**
**File:** `src/main/database.js:268-270`
**Severity:** High

**Current Code:**
```javascript
query += ` ORDER BY ${sortBy} ${sortOrder}`;
```

**Problem:** `sortBy` and `sortOrder` parameters are directly interpolated into SQL queries with no validation. An attacker could send malicious values like `{sortBy: "1 UNION SELECT * FROM tracks"}` to extract unauthorized data.

**Attack Scenario:**
```javascript
// Renderer sends:
getTracks(null, { sortBy: "1 UNION SELECT password FROM users", sortOrder: "ASC" })

// Results in SQL:
// SELECT * FROM tracks ... ORDER BY 1 UNION SELECT password FROM users ASC
```

**Fix:**
```javascript
getTracks(filters = {}, sort = {}) {
  // Whitelist allowed columns
  const allowedColumns = [
    'title', 'artist', 'album', 'track_number',
    'disc_number', 'release_year', 'date_added',
    'duration', 'file_path'
  ];
  const allowedOrder = ['ASC', 'DESC'];

  let query = 'SELECT * FROM tracks WHERE 1=1';

  // ... filter handling ...

  // VALIDATE sort parameters
  if (sort.by && sort.order) {
    if (!allowedColumns.includes(sort.by)) {
      throw new Error(`Invalid sort column: ${sort.by}`);
    }
    if (!allowedOrder.includes(sort.order.toUpperCase())) {
      throw new Error(`Invalid sort order: ${sort.order}`);
    }
    query += ` ORDER BY ${sort.by} ${sort.order.toUpperCase()}`;
  }

  return this.db.prepare(query).all();
}
```

**Testing:** Add unit test with malicious sort parameters that should be rejected.

---

#### 2. Broken Access Control - Overly Permissive IPC Exposure
**OWASP A01:2021 - Broken Access Control**
**File:** `electron/preload/index.ts:51-71`
**Severity:** High

**Current Code:**
```javascript
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args) { return ipcRenderer.on(...) },
  invoke(...args) { return ipcRenderer.invoke(...) },
  send(...args) { return ipcRenderer.send(...) },
});
```

**Problem:** This completely defeats context isolation by exposing the raw ipcRenderer object. A renderer process compromised by XSS or malicious code could:
- Invoke any IPC channel, including undocumented ones
- Register listeners on sensitive events
- Access data not intended for the renderer

**Attack Scenario:**
```javascript
// From compromised renderer code:
const allTracks = window.ipcRenderer.invoke('internal:get-raw-database');
const sensitiveData = window.ipcRenderer.on('private:event', (data) => { ... });
```

**Fix - Remove the generic ipcRenderer completely:**
```javascript
// DELETE lines 51-71 entirely
// Keep ONLY the curated API exposed below:

contextBridge.exposeInMainWorld('api', {
  // File operations
  selectFolder: () => ipcRenderer.invoke('file:select-folder'),
  importMusic: (path) => ipcRenderer.invoke('file:import', path),
  scanFolder: (path) => ipcRenderer.invoke('file:scan-folder', path),

  // Database queries
  getTracks: (filters, sort) => ipcRenderer.invoke('db:get-tracks', filters, sort),
  getAlbums: (filters, sort) => ipcRenderer.invoke('db:get-albums', filters, sort),
  getPlaylists: () => ipcRenderer.invoke('db:get-playlists'),
  searchTracks: (query) => ipcRenderer.invoke('db:search-tracks', query),

  // Metadata updates
  updateTrack: (id, updates) => ipcRenderer.invoke('db:update-track', id, updates),
  updatePlaylist: (id, updates) => ipcRenderer.invoke('db:update-playlist', id, updates),

  // Playlist management
  createPlaylist: (name) => ipcRenderer.invoke('db:create-playlist', name),
  deletePlaylist: (id) => ipcRenderer.invoke('db:delete-playlist', id),
  addToPlaylist: (playlistId, trackId) => ipcRenderer.invoke('db:add-to-playlist', playlistId, trackId),
  removeFromPlaylist: (playlistId, trackId) => ipcRenderer.invoke('db:remove-from-playlist', playlistId, trackId),

  // Import progress
  onImportProgress: (callback) => {
    ipcRenderer.on('import:progress', (_, data) => callback(data));
  },

  // App operations
  getLibraryPath: () => ipcRenderer.invoke('app:get-library-path'),
  getLibraryStats: () => ipcRenderer.invoke('app:get-library-stats'),
  checkLibraryExists: () => ipcRenderer.invoke('app:check-library-exists'),

  // Playback
  play: () => ipcRenderer.invoke('playback:play'),
  pause: () => ipcRenderer.invoke('playback:pause'),
  skip: () => ipcRenderer.invoke('playback:skip'),
  setVolume: (level) => ipcRenderer.invoke('playback:set-volume', level),
});
```

**Testing:** Verify renderer cannot access `window.ipcRenderer` directly. Add test that attempts undocumented IPC calls.

---

#### 3. Path Traversal in Import Handlers
**OWASP A01:2021 - Broken Access Control**
**File:** `electron/main/index.ts:150-163`
**Severity:** High

**Current Code:**
```javascript
ipcMain.handle('file:scan-folder', async (_event, folderPath) => {
  return await libraryManager.scanFolder(folderPath);
});

ipcMain.handle('file:import', async (_event, folderPath) => {
  return await libraryManager.importFolder(folderPath);
});
```

**Problem:** These handlers don't validate paths before filesystem operations. While current implementation uses system file picker (mitigating), there's no programmatic validation. Future code or bypasses could allow:
- Access to system directories (`/etc`, `~/.ssh`, etc.)
- Symlink following attacks
- Relative path traversal (`../../sensitive_data`)

**Attack Scenario:**
```javascript
// If caller could bypass dialog:
await window.api.importMusic('/../../../etc/passwd')
await window.api.importMusic('~/private-keys')
```

**Fix:**
```javascript
ipcMain.handle('file:scan-folder', async (_event, folderPath) => {
  // Validate path safety
  if (!folderPath || typeof folderPath !== 'string') {
    throw new Error('Invalid folder path');
  }

  if (!libraryManager.isValidPath(folderPath)) {
    throw new Error('Access denied: invalid path');
  }

  return await libraryManager.scanFolder(folderPath);
});

ipcMain.handle('file:import', async (_event, folderPath) => {
  // Same validation as scan-folder
  if (!folderPath || typeof folderPath !== 'string') {
    throw new Error('Invalid folder path');
  }

  if (!libraryManager.isValidPath(folderPath)) {
    throw new Error('Access denied: invalid path');
  }

  return await libraryManager.importFolder(folderPath);
});
```

**Verify Library Manager Has:**
```javascript
isValidPath(folderPath) {
  // Must be absolute path
  if (!path.isAbsolute(folderPath)) {
    return false;
  }

  // Must not contain null bytes (filesystem injection)
  if (folderPath.includes('\0')) {
    return false;
  }

  // Must resolve to within allowed directories
  const resolved = path.resolve(folderPath);
  const libraryPath = path.resolve(this.libraryPath);
  const homeDir = path.resolve(os.homedir());

  // Allow: library folder, music directory, home directory
  return resolved.startsWith(libraryPath) ||
         resolved.startsWith(path.join(homeDir, 'Music')) ||
         resolved === homeDir;
}
```

**Testing:** Add tests attempting path traversal (`../..`), absolute system paths, null bytes.

---

### 🟡 MEDIUM PRIORITY

#### 4. Insufficient Input Validation - Metadata Fields
**OWASP A03:2021 - Injection**
**File:** `src/main/database.js:282-308`
**Severity:** Medium

**Problem:** Text fields (artist, album, genre, title) accept arbitrary length strings with no validation. This enables:
- Database bloat attacks
- UI rendering issues with excessively long text
- Memory exhaustion in renderer process

**Current Code:**
```javascript
updateTrack(trackId, updates) {
  const allowedFields = [
    'title', 'artist', 'album', 'album_artist',
    'track_number', 'disc_number', 'release_year',
    'is_compilation', 'artwork_path'
  ];

  // No length validation
  for (const field of Object.keys(updates)) {
    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
  }

  // Updates accepted as-is
  const stmt = this.db.prepare(`UPDATE tracks SET ... WHERE track_id = ?`);
  return stmt.run(...);
}
```

**Fix:**
```javascript
const METADATA_FIELD_LIMITS = {
  title: 500,
  artist: 300,
  album: 300,
  album_artist: 300,
  genre: 100,
  artwork_path: 512,
  track_number: 10,
  disc_number: 10,
  release_year: 4
};

const FIELD_TYPES = {
  title: 'string',
  artist: 'string',
  album: 'string',
  album_artist: 'string',
  track_number: 'number',
  disc_number: 'number',
  release_year: 'number',
  is_compilation: 'boolean',
  artwork_path: 'string'
};

updateTrack(trackId, updates) {
  const allowedFields = Object.keys(FIELD_TYPES);
  const validated = {};

  for (const [field, value] of Object.entries(updates)) {
    // Check field is allowed
    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }

    // Check type
    const expectedType = FIELD_TYPES[field];
    if (typeof value !== expectedType) {
      throw new Error(
        `Field ${field} must be ${expectedType}, got ${typeof value}`
      );
    }

    // Check length for string fields
    if (expectedType === 'string') {
      const limit = METADATA_FIELD_LIMITS[field];
      if (value.length > limit) {
        throw new Error(
          `Field ${field} exceeds maximum length of ${limit} characters`
        );
      }
    }

    // Check range for number fields
    if (expectedType === 'number') {
      if (!Number.isInteger(value)) {
        throw new Error(`Field ${field} must be an integer`);
      }
      if (field === 'release_year' && (value < 1900 || value > 2100)) {
        throw new Error('release_year must be between 1900 and 2100');
      }
      if ((field === 'track_number' || field === 'disc_number') && value < 0) {
        throw new Error(`${field} cannot be negative`);
      }
    }

    validated[field] = value;
  }

  // Build update statement with validated fields
  const setClause = Object.keys(validated)
    .map(field => `${field} = ?`)
    .join(', ');

  const values = Object.values(validated);
  const stmt = this.db.prepare(
    `UPDATE tracks SET ${setClause}, updated_at = ? WHERE track_id = ?`
  );

  return stmt.run(...values, Math.floor(Date.now() / 1000), trackId);
}
```

**Testing:** Add tests with extremely long strings, invalid types, out-of-range numbers.

---

#### 5. Unvalidated Image File Upload
**OWASP A04:2021 - Insecure Design**
**File:** `src/main/import.js` & `src/main/metadata.js`
**Severity:** Medium

**Problem:** Artwork extracted from audio files is cached without validating file integrity. Malformed image metadata could:
- Cause crashes in image parsing libraries
- Enable code execution via image parsing exploits
- Consume excessive disk space
- Corrupt artwork cache

**Current Code:**
```javascript
if (metadata.common.picture && metadata.common.picture.length > 0) {
  artwork = {
    data: picture.data,      // No validation
    format: picture.format,  // Only string checked
    type: picture.type,
    description: picture.description
  };
}
```

**Fix:**
```javascript
async cacheArtwork(pictureMeta) {
  // Step 1: Validate MIME type
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validMimeTypes.includes(pictureMeta.format)) {
    console.warn(`Skipping invalid artwork format: ${pictureMeta.format}`);
    return null;
  }

  // Step 2: Validate file size (max 5MB)
  const MAX_ARTWORK_SIZE = 5 * 1024 * 1024; // 5MB
  if (!pictureMeta.data || pictureMeta.data.length > MAX_ARTWORK_SIZE) {
    console.warn('Artwork exceeds size limit (5MB), skipping');
    return null;
  }

  // Step 3: Validate magic bytes (file signature)
  const magicNumbers = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/webp': [0x52, 0x49, 0x46, 0x46] // RIFF
  };

  const expectedMagic = magicNumbers[pictureMeta.format];
  if (expectedMagic) {
    let matches = true;
    for (let i = 0; i < expectedMagic.length; i++) {
      if (pictureMeta.data[i] !== expectedMagic[i]) {
        matches = false;
        break;
      }
    }
    if (!matches) {
      console.warn(`Invalid magic bytes for ${pictureMeta.format}`);
      return null;
    }
  }

  // Step 4: Calculate content hash for deduplication
  const crypto = require('crypto');
  const hash = crypto
    .createHash('sha256')
    .update(pictureMeta.data)
    .digest('hex');

  // Step 5: Check if this artwork already cached
  const cacheDir = path.join(this.libraryPath, 'Artwork', 'albums');
  const filePath = path.join(cacheDir, `${hash}.${this.getFileExtension(pictureMeta.format)}`);

  if (fs.existsSync(filePath)) {
    return filePath; // Already cached
  }

  // Step 6: Write with error handling
  try {
    await fs.promises.mkdir(cacheDir, { recursive: true });
    await fs.promises.writeFile(filePath, pictureMeta.data);
    return filePath;
  } catch (error) {
    console.error('Failed to cache artwork:', error.message);
    return null;
  }
}

getFileExtension(mimeType) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  return extensions[mimeType] || 'jpg';
}
```

**Testing:** Add tests with:
- Invalid MIME types
- Oversized artwork files
- Files with wrong magic bytes
- Corrupted image data

---

#### 6. Poor Error Handling in Update Mechanism
**OWASP A09:2021 - Logging and Monitoring**
**File:** `electron/main/update.ts`
**Severity:** Medium

**Problem:** Update error handlers are empty or incomplete, hiding failures:
```javascript
ipcMain.on('app-update-error', (_event, error) => {
  // No logging, no user notification
});
```

This makes debugging update failures difficult and leaves users unaware of failures.

**Fix:**
```javascript
// Create update event logger
function logUpdateEvent(eventType, data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    version: app.getVersion(),
    ...data
  };

  console.log(`[UPDATE] ${eventType}:`, logEntry);

  // Optionally: Write to file for later analysis
  // fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
}

// Update event handlers
autoUpdater.on('checking-for-update', () => {
  logUpdateEvent('checking-for-update', {});
});

autoUpdater.on('update-available', (info) => {
  logUpdateEvent('update-available', {
    version: info.version,
    releaseDate: info.releaseDate
  });

  if (mainWindow) {
    mainWindow.webContents.send('app-update-available', {
      version: info.version,
      releaseDate: info.releaseDate
    });
  }
});

autoUpdater.on('update-not-available', () => {
  logUpdateEvent('update-not-available', {});
});

autoUpdater.on('error', (error) => {
  logUpdateEvent('update-error', {
    code: error.code,
    message: error.message,
    stack: error.stack
  });

  // Notify renderer
  if (mainWindow) {
    mainWindow.webContents.send('app-update-failed', {
      message: 'Failed to check for updates. Using current version.',
      timestamp: Date.now()
    });
  }
});

autoUpdater.on('download-progress', (progress) => {
  logUpdateEvent('download-progress', {
    percent: progress.percent.toFixed(2),
    bytesPerSecond: progress.bytesPerSecond,
    transferred: progress.transferred,
    total: progress.total
  });

  if (mainWindow) {
    mainWindow.webContents.send('app-update-progress', progress);
  }
});

autoUpdater.on('update-downloaded', () => {
  logUpdateEvent('update-downloaded', {});

  if (mainWindow) {
    mainWindow.webContents.send('app-update-downloaded', {
      message: 'Update ready to install. Restart to apply.',
      timestamp: Date.now()
    });
  }
});
```

**Renderer Side Error Handling:**
```javascript
// In renderer/App.jsx or update manager component
useEffect(() => {
  const unsubscribeFailed = window.api.on('app-update-failed', (data) => {
    showNotification({
      type: 'error',
      title: 'Update Check Failed',
      message: data.message,
      duration: 5000
    });
  });

  const unsubscribeDownloaded = window.api.on('app-update-downloaded', (data) => {
    showNotification({
      type: 'info',
      title: 'Update Available',
      message: data.message,
      action: {
        label: 'Restart',
        onClick: () => window.api.restartApp()
      }
    });
  });

  return () => {
    unsubscribeFailed();
    unsubscribeDownloaded();
  };
}, []);
```

**Testing:** Test update flow with:
- No internet connection
- Corrupted update files
- Signature verification failure

---

### 🟢 LOW PRIORITY / OBSERVATIONS

#### 7. Missing Security Event Logging
**OWASP A09:2021 - Logging and Monitoring**
**Severity:** Low

**Observation:** Security-relevant events aren't logged:
- Failed import attempts
- Invalid path access attempts
- Database operation errors
- Malformed metadata

**Recommendation:** Add structured logging for security events:
```javascript
function logSecurityEvent(eventType, severity, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    severity, // 'low', 'medium', 'high'
    ...details
  };

  console.log(`[SECURITY-${severity.toUpperCase()}]`, entry);
}

// Usage in import:
try {
  await libraryManager.scanFolder(folderPath);
} catch (error) {
  logSecurityEvent('import-failed', 'medium', {
    folderPath,
    error: error.message
  });
}
```

---

#### 8. Dependency Vulnerability Monitoring
**Severity:** Low (ongoing maintenance task)

**Action Items:**
```bash
# Check for known vulnerabilities
npm audit

# Keep dependencies updated
npm update
npm outdated

# Monitor specific high-risk dependencies:
# - music-metadata (untrusted file parsing)
# - better-sqlite3 (native binary)
# - electron-updater (network communication)
```

**Add to CI/CD:**
- Run `npm audit` on every commit
- Fail build if vulnerabilities found
- Set up Dependabot for automatic updates

---

## Implementation Roadmap

### Phase 1 (Current)
- [ ] **Priority 1a:** Fix SQL injection in sort parameters (database.js)
- [ ] **Priority 1b:** Remove overly permissive ipcRenderer exposure (preload.ts)
- [ ] **Priority 1c:** Add path validation to import handlers (main/index.ts)
- [ ] **Priority 2a:** Add metadata field length validation (database.js)
- [ ] **Priority 2b:** Implement artwork validation (import.js/metadata.js)
- [ ] **Priority 2c:** Add error logging for updates (update.ts)

### Phase 2 (Before Public Use)
- [ ] Security event logging infrastructure
- [ ] Comprehensive security unit tests
- [ ] Dependency vulnerability scanning in CI/CD
- [ ] Security documentation for contributors

---

## Testing Strategy

### Security Test Coverage

**High-Priority Fixes:**
```javascript
// test/security/sql-injection.test.js
describe('SQL Injection Prevention', () => {
  it('should reject malicious sortBy values', () => {
    const malicious = "1 UNION SELECT * FROM tracks";
    expect(() => {
      db.getTracks({}, { by: malicious, order: 'ASC' });
    }).toThrow('Invalid sort column');
  });

  it('should reject malicious sortOrder values', () => {
    expect(() => {
      db.getTracks({}, { by: 'title', order: 'ASC; DROP TABLE tracks;' });
    }).toThrow('Invalid sort order');
  });
});

// test/security/path-traversal.test.js
describe('Path Traversal Prevention', () => {
  const maliciousPaths = [
    '/../../../etc/passwd',
    '~/private-keys',
    '/etc/shadow',
    '../..',
    'path/with\0null/byte'
  ];

  maliciousPaths.forEach(path => {
    it(`should reject path: ${path}`, () => {
      expect(() => {
        libraryManager.isValidPath(path);
      }).toBe(false);
    });
  });
});

// test/security/ipc-access-control.test.js
describe('IPC Access Control', () => {
  it('should not expose raw ipcRenderer', () => {
    expect(window.ipcRenderer).toBeUndefined();
  });

  it('should only expose curated API methods', () => {
    const allowedMethods = [
      'selectFolder', 'importMusic', 'getTracks',
      'updateTrack', 'createPlaylist', 'play', 'pause'
    ];

    allowedMethods.forEach(method => {
      expect(window.api[method]).toBeDefined();
    });
  });
});
```

### Manual Testing Checklist
- [ ] Test import with path traversal attempts
- [ ] Test sort with SQL injection payloads
- [ ] Test metadata update with extremely long strings
- [ ] Test artwork caching with corrupted files
- [ ] Test update flow with no internet
- [ ] Verify all security errors logged appropriately

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Electron Security Documentation](https://www.electronjs.org/docs/tutorial/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [SQLite3 Security](https://www.sqlite.org/security.html)
- [NIST Secure Software Development Framework](https://csrc.nist.gov/publications/detail/sp/800-218/final)

---

## Sign-Off

**Reviewed By:** Claude Code (Security Audit Agent)
**Date:** January 2026
**Status:** Ready for implementation

All findings are implementable within Phase 1 scope. Recommend addressing high-priority items before expanding feature set.
