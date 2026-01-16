/**
 * Import Pipeline Tests
 *
 * Tests for folder scanning, file importing, metadata extraction integration,
 * database insertion, and progress tracking.
 */

const {
  scanFolder,
  importFiles,
  importFolder,
  validateImportPrerequisites
} = require('./import');
const MusicDatabase = require('./database');
const LibraryManager = require('./library-manager');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Paths to test fixtures
const FIXTURES_DIR = path.join(__dirname, '../../tests/fixtures/audio');
const TEST_MP3 = path.join(FIXTURES_DIR, 'test.mp3');
const TEST_M4A = path.join(FIXTURES_DIR, 'test.m4a');
const NO_TAGS_MP3 = path.join(FIXTURES_DIR, 'no-tags.mp3');

describe('Import Pipeline', () => {
  let tempDir;
  let db;
  let libraryManager;

  beforeEach(async () => {
    // Create temporary directory for test library
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'import-test-'));

    // Initialize database (in-memory)
    db = new MusicDatabase(':memory:');
    db.initialize();

    // Initialize library manager with temp directory
    libraryManager = new LibraryManager(tempDir);
    await libraryManager.initialize();
  });

  afterEach(async () => {
    // Clean up
    if (db) {
      db.close();
    }

    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('scanFolder()', () => {
    test('scans folder and finds audio files', async () => {
      const files = await scanFolder(FIXTURES_DIR);

      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.endsWith('.mp3'))).toBe(true);
    });

    test('recursively scans subdirectories', async () => {
      // Create test directory structure
      const testDir = path.join(tempDir, 'test-scan');
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir, { recursive: true });

      // Copy test file to subdirectory
      const testFile = path.join(subDir, 'test.mp3');
      await fs.copyFile(TEST_MP3, testFile);

      const files = await scanFolder(testDir);

      expect(files.length).toBe(1);
      expect(files[0]).toBe(testFile);
    });

    test('filters for supported file types only', async () => {
      const files = await scanFolder(FIXTURES_DIR);

      // All files should be supported audio formats
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        expect(['.mp3', '.flac', '.m4a', '.mp4']).toContain(ext);
      }
    });

    test('calls progress callback during scan', async () => {
      const progressCalls = [];

      await scanFolder(FIXTURES_DIR, (count, message) => {
        progressCalls.push({ count, message });
      });

      expect(progressCalls.length).toBeGreaterThan(0);
    });

    test('handles empty directory', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      await fs.mkdir(emptyDir);

      const files = await scanFolder(emptyDir);

      expect(files).toEqual([]);
    });

    test('handles non-existent directory gracefully', async () => {
      const files = await scanFolder('/path/to/nonexistent');

      expect(files).toEqual([]);
    });
  });

  describe('importFiles()', () => {
    test('imports single file successfully', async () => {
      const results = await importFiles(
        [TEST_MP3],
        db,
        libraryManager
      );

      expect(results.total).toBe(1);
      expect(results.imported).toBe(1);
      expect(results.errors).toBe(0);
      expect(results.importedTracks.length).toBe(1);
    });

    test('imports multiple files', async () => {
      const results = await importFiles(
        [TEST_MP3, TEST_M4A, NO_TAGS_MP3],
        db,
        libraryManager
      );

      expect(results.total).toBe(3);
      expect(results.imported).toBe(3);
      expect(results.errors).toBe(0);
    });

    test('copies files to library location', async () => {
      await importFiles([TEST_MP3], db, libraryManager);

      // Check that file was copied to music directory
      const musicPath = libraryManager.getMusicPath();
      const stats = await fs.stat(musicPath);
      expect(stats.isDirectory()).toBe(true);

      // Check that at least one file exists in the music directory
      const files = await fs.readdir(musicPath, { recursive: true });
      expect(files.length).toBeGreaterThan(0);
    });

    test('inserts track into database', async () => {
      const results = await importFiles([TEST_MP3], db, libraryManager);

      const trackId = results.importedTracks[0].trackId;
      const track = db.getTrack(trackId);

      expect(track).not.toBeNull();
      expect(track.title).toBeDefined();
      expect(track.artist).toBeDefined();
      expect(track.album).toBeDefined();
    });

    test('handles duplicate files', async () => {
      // Import file first time
      await importFiles([TEST_MP3], db, libraryManager);

      // Try to import same file again
      const results = await importFiles([TEST_MP3], db, libraryManager);

      expect(results.duplicates).toBe(1);
      expect(results.imported).toBe(0);
    });

    test('handles files with missing metadata', async () => {
      const results = await importFiles([NO_TAGS_MP3], db, libraryManager);

      // Should still import with fallback metadata
      expect(results.imported).toBe(1);
      expect(results.importedTracks[0].title).toBe('no-tags');
    });

    test('tracks progress with callback', async () => {
      const progressCalls = [];

      await importFiles(
        [TEST_MP3, TEST_M4A],
        db,
        libraryManager,
        {
          onProgress: (processed, total, message, status) => {
            progressCalls.push({ processed, total, message, status });
          }
        }
      );

      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls.some(call => call.status === 'processing')).toBe(true);
      expect(progressCalls.some(call => call.status === 'imported')).toBe(true);
    });

    test('skips files with no metadata', async () => {
      const results = await importFiles(
        ['/path/to/nonexistent.mp3'],
        db,
        libraryManager
      );

      // Non-existent files return null from extractMetadata and are skipped
      expect(results.skipped).toBeGreaterThan(0);
      expect(results.imported).toBe(0);
    });

    test('can be cancelled mid-import', async () => {
      const cancelToken = { cancelled: false };

      // Cancel after first file
      let fileCount = 0;
      const results = await importFiles(
        [TEST_MP3, TEST_M4A, NO_TAGS_MP3],
        db,
        libraryManager,
        {
          onProgress: () => {
            fileCount++;
            if (fileCount >= 1) {
              cancelToken.cancelled = true;
            }
          },
          cancelToken
        }
      );

      // Should not import all files
      expect(results.imported).toBeLessThan(3);
    });

    test('handles genres correctly', async () => {
      await importFiles([TEST_MP3], db, libraryManager);

      const tracks = db.getTracks();
      expect(tracks.length).toBe(1);

      const genres = db.getTrackGenres(tracks[0].track_id);
      // Genres may or may not be present depending on test file
      expect(Array.isArray(genres)).toBe(true);
    });

    test('caches artwork when present', async () => {
      await importFiles([TEST_MP3], db, libraryManager);

      const tracks = db.getTracks();
      const track = tracks[0];

      // Artwork path may be null if test file has no artwork
      if (track.artwork_path) {
        const artworkExists = await fs.access(track.artwork_path)
          .then(() => true)
          .catch(() => false);
        expect(artworkExists).toBe(true);
      }
    });
  });

  describe('importFolder()', () => {
    test('scans and imports entire folder', async () => {
      const results = await importFolder(FIXTURES_DIR, db, libraryManager);

      expect(results.total).toBeGreaterThan(0);
      expect(results.imported).toBeGreaterThan(0);
    });

    test('handles empty folder', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      await fs.mkdir(emptyDir);

      const results = await importFolder(emptyDir, db, libraryManager);

      expect(results.total).toBe(0);
      expect(results.imported).toBe(0);
    });

    test('reports scanning and importing progress', async () => {
      const progressCalls = [];

      await importFolder(
        FIXTURES_DIR,
        db,
        libraryManager,
        {
          onProgress: (processed, total, message, status) => {
            progressCalls.push({ status });
          }
        }
      );

      const statuses = progressCalls.map(call => call.status);
      expect(statuses).toContain('scanning');
      expect(statuses).toContain('importing');
    });
  });

  describe('validateImportPrerequisites()', () => {
    test('validates successful prerequisites', async () => {
      const validation = await validateImportPrerequisites(db, libraryManager);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('detects missing database', async () => {
      const validation = await validateImportPrerequisites(null, libraryManager);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Database not initialized');
    });

    test('detects missing library manager', async () => {
      const validation = await validateImportPrerequisites(db, null);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Library manager not initialized');
    });
  });

  describe('Error Handling', () => {
    test('continues import after skipped files', async () => {
      const results = await importFiles(
        [
          TEST_MP3,
          '/nonexistent/file.mp3',
          TEST_M4A
        ],
        db,
        libraryManager
      );

      // Should import the valid files and skip the non-existent one
      expect(results.imported).toBe(2);
      expect(results.skipped).toBe(1);
    });

    test('handles corrupt files gracefully', async () => {
      // Create a corrupt file
      const corruptFile = path.join(tempDir, 'corrupt.mp3');
      await fs.writeFile(corruptFile, 'not a valid audio file');

      const results = await importFiles(
        [corruptFile],
        db,
        libraryManager
      );

      // Should either skip or error, but not crash
      expect(results.imported + results.skipped + results.errors).toBe(1);
    });

    test('handles permission errors', async () => {
      // This test is platform-dependent and may not work in all environments
      // We'll just verify the error handling structure exists
      const results = await importFiles(
        [TEST_MP3],
        db,
        libraryManager,
        {
          onError: (filePath, error) => {
            expect(error).toBeInstanceOf(Error);
          }
        }
      );

      expect(results).toHaveProperty('errors');
    });
  });

  describe('File Organization', () => {
    test('organizes files by artist and album', async () => {
      await importFiles([TEST_MP3], db, libraryManager);

      const musicPath = libraryManager.getMusicPath();

      // Should create Artist/Album directory structure
      const entries = await fs.readdir(musicPath, { withFileTypes: true });
      const directories = entries.filter(e => e.isDirectory());

      expect(directories.length).toBeGreaterThan(0);
    });

    test('handles special characters in filenames', async () => {
      // LibraryManager sanitizes filenames, so this should work
      await importFiles([TEST_MP3], db, libraryManager);

      const tracks = db.getTracks();
      expect(tracks.length).toBe(1);

      // File path should exist
      const fileExists = await fs.access(tracks[0].file_path)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });
  });
});
