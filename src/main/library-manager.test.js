// Comprehensive tests for LibraryManager
const LibraryManager = require('./library-manager');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('LibraryManager', () => {
  let libraryManager;
  let testLibraryPath;

  beforeEach(async () => {
    // Create a temporary directory for testing
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tuuuuunes-test-'));
    testLibraryPath = tmpDir;
    libraryManager = new LibraryManager(testLibraryPath);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testLibraryPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    test('uses default library path when none provided', () => {
      const defaultLibrary = new LibraryManager();
      const expected = path.join(os.homedir(), 'Music', 'Tuuuuunes');
      expect(defaultLibrary.libraryPath).toBe(expected);
    });

    test('uses custom library path when provided', () => {
      expect(libraryManager.libraryPath).toBe(testLibraryPath);
    });

    test('returns correct default library path', () => {
      const expected = path.join(os.homedir(), 'Music', 'Tuuuuunes');
      expect(libraryManager.getDefaultLibraryPath()).toBe(expected);
    });
  });

  describe('Path Getters', () => {
    test('returns correct music path', () => {
      const expected = path.join(testLibraryPath, 'Music');
      expect(libraryManager.getMusicPath()).toBe(expected);
    });

    test('returns correct artwork path', () => {
      const expected = path.join(testLibraryPath, 'Artwork');
      expect(libraryManager.getArtworkPath()).toBe(expected);
    });

    test('returns correct albums artwork path', () => {
      const expected = path.join(testLibraryPath, 'Artwork', 'albums');
      expect(libraryManager.getAlbumsArtworkPath()).toBe(expected);
    });

    test('returns correct playlists artwork path', () => {
      const expected = path.join(testLibraryPath, 'Artwork', 'playlists');
      expect(libraryManager.getPlaylistsArtworkPath()).toBe(expected);
    });

    test('returns correct database path', () => {
      const expected = path.join(testLibraryPath, 'Database');
      expect(libraryManager.getDatabasePath()).toBe(expected);
    });

    test('returns correct database file path', () => {
      const expected = path.join(testLibraryPath, 'Database', 'library.db');
      expect(libraryManager.getDatabaseFilePath()).toBe(expected);
    });
  });

  describe('Folder Structure Creation', () => {
    test('initializes library folder structure', async () => {
      await libraryManager.initialize();

      // Check all folders exist
      const folders = [
        testLibraryPath,
        libraryManager.getMusicPath(),
        libraryManager.getArtworkPath(),
        libraryManager.getAlbumsArtworkPath(),
        libraryManager.getPlaylistsArtworkPath(),
        libraryManager.getDatabasePath()
      ];

      for (const folder of folders) {
        const stat = await fs.stat(folder);
        expect(stat.isDirectory()).toBe(true);
      }
    });

    test('initialize is idempotent', async () => {
      await libraryManager.initialize();
      await libraryManager.initialize(); // Should not throw

      const exists = await libraryManager.exists();
      expect(exists).toBe(true);
    });

    test('exists returns false for non-existent library', async () => {
      // Create a new manager with a path that doesn't exist yet
      const nonExistentPath = path.join(testLibraryPath, 'non-existent');
      const newManager = new LibraryManager(nonExistentPath);

      const exists = await newManager.exists();
      expect(exists).toBe(false);
    });

    test('exists returns true after initialization', async () => {
      await libraryManager.initialize();
      const exists = await libraryManager.exists();
      expect(exists).toBe(true);
    });
  });

  describe('Permission Verification', () => {
    test('verifies permissions for initialized library', async () => {
      await libraryManager.initialize();
      const hasPermissions = await libraryManager.verifyPermissions();
      expect(hasPermissions).toBe(true);
    });

    test('initializes library during permission check if not exists', async () => {
      const hasPermissions = await libraryManager.verifyPermissions();
      expect(hasPermissions).toBe(true);

      const exists = await libraryManager.exists();
      expect(exists).toBe(true);
    });
  });

  describe('Filename Sanitization', () => {
    test('removes invalid characters', () => {
      const dirty = 'Track / Name \\ With ? Invalid * Chars : | " < >';
      const clean = libraryManager.sanitizeFilename(dirty);

      expect(clean).not.toContain('/');
      expect(clean).not.toContain('\\');
      expect(clean).not.toContain('?');
      expect(clean).not.toContain('*');
      expect(clean).not.toContain(':');
      expect(clean).not.toContain('|');
      expect(clean).not.toContain('"');
      expect(clean).not.toContain('<');
      expect(clean).not.toContain('>');
    });

    test('trims whitespace', () => {
      const input = '   Track Name   ';
      const output = libraryManager.sanitizeFilename(input);
      expect(output).toBe('Track Name');
    });

    test('replaces multiple spaces with single space', () => {
      const input = 'Track    Name    With    Spaces';
      const output = libraryManager.sanitizeFilename(input);
      expect(output).toBe('Track Name With Spaces');
    });

    test('handles empty string', () => {
      const output = libraryManager.sanitizeFilename('');
      expect(output).toBe('Unknown');
    });

    test('handles null/undefined', () => {
      expect(libraryManager.sanitizeFilename(null)).toBe('Unknown');
      expect(libraryManager.sanitizeFilename(undefined)).toBe('Unknown');
    });

    test('handles unicode characters', () => {
      const input = 'Track 音楽 Name';
      const output = libraryManager.sanitizeFilename(input);
      expect(output).toBe('Track 音楽 Name');
    });

    test('truncates very long filenames', () => {
      const longName = 'A'.repeat(300);
      const output = libraryManager.sanitizeFilename(longName);
      expect(output.length).toBeLessThanOrEqual(200);
    });

    test('handles special characters that should be kept', () => {
      const input = "Track's Name (feat. Artist) - Remix";
      const output = libraryManager.sanitizeFilename(input);
      expect(output).toBe("Track's Name (feat. Artist) - Remix");
    });
  });

  describe('Track Path Generation', () => {
    test('generates correct path with complete metadata', () => {
      const metadata = {
        artist: 'Test Artist',
        album: 'Test Album',
        title: 'Test Track',
        track_number: 5,
        file_path: '/original/path/track.mp3'
      };

      const trackPath = libraryManager.generateTrackPath(metadata);
      expect(trackPath).toContain('Test Artist');
      expect(trackPath).toContain('Test Album');
      expect(trackPath).toContain('05 Test Track.mp3');
    });

    test('uses album_artist when artist is missing', () => {
      const metadata = {
        album_artist: 'Album Artist',
        album: 'Test Album',
        title: 'Test Track',
        file_path: '/track.mp3'
      };

      const trackPath = libraryManager.generateTrackPath(metadata);
      expect(trackPath).toContain('Album Artist');
    });

    test('uses Unknown Artist when both artist and album_artist missing', () => {
      const metadata = {
        album: 'Test Album',
        title: 'Test Track',
        file_path: '/track.mp3'
      };

      const trackPath = libraryManager.generateTrackPath(metadata);
      expect(trackPath).toContain('Unknown Artist');
    });

    test('uses Unknown Album when album missing', () => {
      const metadata = {
        artist: 'Test Artist',
        title: 'Test Track',
        file_path: '/track.mp3'
      };

      const trackPath = libraryManager.generateTrackPath(metadata);
      expect(trackPath).toContain('Unknown Album');
    });

    test('uses Unknown Track when title missing', () => {
      const metadata = {
        artist: 'Test Artist',
        album: 'Test Album',
        file_path: '/track.mp3'
      };

      const trackPath = libraryManager.generateTrackPath(metadata);
      expect(trackPath).toContain('Unknown Track');
    });

    test('pads track numbers correctly', () => {
      const metadata1 = {
        artist: 'Artist',
        album: 'Album',
        title: 'Track',
        track_number: 1,
        file_path: '/track.mp3'
      };

      const metadata2 = {
        artist: 'Artist',
        album: 'Album',
        title: 'Track',
        track_number: 12,
        file_path: '/track.mp3'
      };

      const path1 = libraryManager.generateTrackPath(metadata1);
      const path2 = libraryManager.generateTrackPath(metadata2);

      expect(path1).toContain('01 Track');
      expect(path2).toContain('12 Track');
    });

    test('preserves file extension', () => {
      const mp3 = { artist: 'A', album: 'B', title: 'C', file_path: '/track.mp3' };
      const flac = { artist: 'A', album: 'B', title: 'C', file_path: '/track.flac' };
      const m4a = { artist: 'A', album: 'B', title: 'C', file_path: '/track.m4a' };

      expect(libraryManager.generateTrackPath(mp3)).toContain('.mp3');
      expect(libraryManager.generateTrackPath(flac)).toContain('.flac');
      expect(libraryManager.generateTrackPath(m4a)).toContain('.m4a');
    });

    test('uses codec for extension when file_path missing', () => {
      const metadata = {
        artist: 'A',
        album: 'B',
        title: 'C',
        codec: 'flac'
      };

      const trackPath = libraryManager.generateTrackPath(metadata);
      expect(trackPath).toContain('.flac');
    });

    test('sanitizes all path components', () => {
      const metadata = {
        artist: 'Artist/With\\Invalid:Chars',
        album: 'Album*With?Invalid|Chars',
        title: 'Track<With>Invalid"Chars',
        file_path: '/track.mp3'
      };

      const trackPath = libraryManager.generateTrackPath(metadata);
      const filename = path.basename(trackPath);
      const dirname = path.dirname(trackPath);

      // Check that the filename and directory names don't contain invalid chars
      // (The full path will have / as separators which is valid)
      expect(filename).not.toMatch(/[\\?*:|"<>]/);
      expect(dirname).not.toMatch(/[\\?*:|"<>]/);
    });
  });

  describe('Artwork Management', () => {
    test('hashes data consistently', () => {
      const data1 = Buffer.from('test data');
      const data2 = Buffer.from('test data');
      const data3 = Buffer.from('different data');

      const hash1 = libraryManager.hashData(data1);
      const hash2 = libraryManager.hashData(data2);
      const hash3 = libraryManager.hashData(data3);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    test('generates artwork path for albums', () => {
      const artworkData = Buffer.from('fake image data');
      const artworkPath = libraryManager.generateArtworkPath(artworkData, 'album');

      expect(artworkPath).toContain(libraryManager.getAlbumsArtworkPath());
      expect(artworkPath).toContain('.jpg');
    });

    test('generates artwork path for playlists', () => {
      const artworkData = Buffer.from('fake image data');
      const artworkPath = libraryManager.generateArtworkPath(artworkData, 'playlist');

      expect(artworkPath).toContain(libraryManager.getPlaylistsArtworkPath());
      expect(artworkPath).toContain('.jpg');
    });

    test('saves artwork to filesystem', async () => {
      await libraryManager.initialize();

      const artworkData = Buffer.from('fake image data');
      const savedPath = await libraryManager.saveArtwork(artworkData, 'album');

      // Check file exists
      const stat = await fs.stat(savedPath);
      expect(stat.isFile()).toBe(true);

      // Check content matches
      const savedData = await fs.readFile(savedPath);
      expect(savedData.toString()).toBe('fake image data');
    });

    test('deduplicates identical artwork', async () => {
      await libraryManager.initialize();

      const artworkData = Buffer.from('fake image data');

      const path1 = await libraryManager.saveArtwork(artworkData, 'album');
      const path2 = await libraryManager.saveArtwork(artworkData, 'album');

      expect(path1).toBe(path2);

      // Should only have one file
      const files = await fs.readdir(libraryManager.getAlbumsArtworkPath());
      const jpgFiles = files.filter(f => f.endsWith('.jpg'));
      expect(jpgFiles.length).toBe(1);
    });
  });

  describe('Statistics', () => {
    test('returns stats for non-existent library', async () => {
      // Create a new manager with a path that doesn't exist
      const nonExistentPath = path.join(testLibraryPath, 'non-existent');
      const newManager = new LibraryManager(nonExistentPath);

      const stats = await newManager.getStats();

      expect(stats.exists).toBe(false);
      expect(stats.totalSize).toBe(0);
      expect(stats.musicFiles).toBe(0);
      expect(stats.artworkFiles).toBe(0);
    });

    test('returns stats for initialized library', async () => {
      await libraryManager.initialize();

      const stats = await libraryManager.getStats();

      expect(stats.exists).toBe(true);
      expect(stats.totalSize).toBeGreaterThanOrEqual(0);
      expect(stats.musicFiles).toBe(0);
      expect(stats.artworkFiles).toBe(0);
    });

    test('counts music files correctly', async () => {
      await libraryManager.initialize();

      // Create some fake music files
      const musicPath = libraryManager.getMusicPath();
      await fs.writeFile(path.join(musicPath, 'test1.mp3'), 'data');
      await fs.writeFile(path.join(musicPath, 'test2.flac'), 'data');
      await fs.writeFile(path.join(musicPath, 'test3.m4a'), 'data');

      const stats = await libraryManager.getStats();

      expect(stats.musicFiles).toBe(3);
    });

    test('counts artwork files correctly', async () => {
      await libraryManager.initialize();

      // Create some fake artwork files
      const artworkPath = libraryManager.getAlbumsArtworkPath();
      await fs.writeFile(path.join(artworkPath, 'art1.jpg'), 'data');
      await fs.writeFile(path.join(artworkPath, 'art2.jpg'), 'data');

      const stats = await libraryManager.getStats();

      expect(stats.artworkFiles).toBe(2);
    });

    test('calculates total size correctly', async () => {
      await libraryManager.initialize();

      const musicPath = libraryManager.getMusicPath();
      await fs.writeFile(path.join(musicPath, 'test.mp3'), 'a'.repeat(1000));

      const stats = await libraryManager.getStats();

      expect(stats.totalSize).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Size Formatting', () => {
    test('formats bytes correctly', () => {
      expect(libraryManager.formatSize(100)).toBe('100.00 B');
      expect(libraryManager.formatSize(1024)).toBe('1.00 KB');
      expect(libraryManager.formatSize(1024 * 1024)).toBe('1.00 MB');
      expect(libraryManager.formatSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    test('formats fractional sizes', () => {
      expect(libraryManager.formatSize(1536)).toBe('1.50 KB');
      expect(libraryManager.formatSize(1024 * 1024 * 1.5)).toBe('1.50 MB');
    });
  });

  describe('Path Validation', () => {
    const os = require('os');
    const homeDir = os.homedir();

    test('validates paths within home directory', () => {
      expect(libraryManager.isValidPath(path.join(homeDir, 'Music'))).toBe(true);
      expect(libraryManager.isValidPath(path.join(homeDir, 'Documents'))).toBe(true);
    });

    test('rejects paths outside home directory', () => {
      expect(libraryManager.isValidPath('/etc/passwd')).toBe(false);
      expect(libraryManager.isValidPath('/var/log')).toBe(false);
      expect(libraryManager.isValidPath('/tmp/test')).toBe(false);
    });

    test('rejects relative paths', () => {
      expect(libraryManager.isValidPath('relative/path')).toBe(false);
    });

    test('rejects null/undefined', () => {
      expect(libraryManager.isValidPath(null)).toBe(false);
      expect(libraryManager.isValidPath(undefined)).toBe(false);
    });

    test('rejects non-string values', () => {
      expect(libraryManager.isValidPath(123)).toBe(false);
      expect(libraryManager.isValidPath({})).toBe(false);
    });

    test('rejects paths with null bytes', () => {
      expect(libraryManager.isValidPath('/path/with\0null')).toBe(false);
    });

    test('rejects sensitive directories', () => {
      expect(libraryManager.isValidPath(path.join(homeDir, '.ssh'))).toBe(false);
      expect(libraryManager.isValidPath(path.join(homeDir, '.ssh', 'id_rsa'))).toBe(false);
      expect(libraryManager.isValidPath(path.join(homeDir, '.gnupg'))).toBe(false);
      expect(libraryManager.isValidPath(path.join(homeDir, '.aws'))).toBe(false);
    });

    test('handles path traversal attempts', () => {
      // Path traversal that tries to escape home
      expect(libraryManager.isValidPath(path.join(homeDir, '..', 'etc', 'passwd'))).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    test('ensureDirectory creates directory if not exists', async () => {
      const newDir = path.join(testLibraryPath, 'new', 'nested', 'directory');

      await libraryManager.ensureDirectory(newDir);

      const stat = await fs.stat(newDir);
      expect(stat.isDirectory()).toBe(true);
    });

    test('ensureDirectory does not throw if directory exists', async () => {
      const newDir = path.join(testLibraryPath, 'existing');

      await fs.mkdir(newDir);
      await libraryManager.ensureDirectory(newDir); // Should not throw

      const stat = await fs.stat(newDir);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handles very long paths', async () => {
      const metadata = {
        artist: 'A'.repeat(100),
        album: 'B'.repeat(100),
        title: 'C'.repeat(100),
        file_path: '/track.mp3'
      };

      const trackPath = libraryManager.generateTrackPath(metadata);

      // Path should be truncated to reasonable length
      expect(trackPath.length).toBeLessThan(1000);
    });

    test('handles unicode in all path components', async () => {
      const metadata = {
        artist: '音楽家',
        album: 'アルバム',
        title: '曲名',
        file_path: '/track.mp3'
      };

      const trackPath = libraryManager.generateTrackPath(metadata);

      expect(trackPath).toContain('音楽家');
      expect(trackPath).toContain('アルバム');
      expect(trackPath).toContain('曲名');
    });

    test('handles emojis in filenames', () => {
      const input = 'Track 🎵 Name 🎶';
      const output = libraryManager.sanitizeFilename(input);
      expect(output).toBe('Track 🎵 Name 🎶');
    });

    test('handles mixed invalid and valid characters', () => {
      const input = 'Track/Name:With*Both?Valid&Invalid|Chars';
      const output = libraryManager.sanitizeFilename(input);

      expect(output).not.toContain('/');
      expect(output).not.toContain(':');
      expect(output).not.toContain('*');
      expect(output).not.toContain('?');
      expect(output).not.toContain('|');
      expect(output).toContain('&'); // Valid character
    });
  });
});
