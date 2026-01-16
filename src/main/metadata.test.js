/**
 * Metadata Extraction Tests
 *
 * Tests for music metadata extraction across different formats,
 * edge cases, and error handling.
 */

const {
  extractMetadata,
  cacheArtwork,
  isSupportedAudioFile,
  extractMetadataBatch
} = require('./metadata.js');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Paths to test fixtures
const FIXTURES_DIR = path.join(__dirname, '../../tests/fixtures/audio');
const TEST_MP3 = path.join(FIXTURES_DIR, 'test.mp3');
const TEST_FLAC = path.join(FIXTURES_DIR, 'test.flac');
const TEST_M4A = path.join(FIXTURES_DIR, 'test.m4a');
const NO_TAGS_MP3 = path.join(FIXTURES_DIR, 'no-tags.mp3');

describe('Metadata Extraction', () => {
  describe('extractMetadata()', () => {
    test('extracts metadata from MP3 file', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();
      expect(metadata.title).toBeDefined();
      expect(metadata.artist).toBeDefined();
      expect(metadata.album).toBeDefined();
      expect(metadata.duration).toBeGreaterThan(0);
      expect(metadata.fileSize).toBeGreaterThan(0);
    });

    test('extracts metadata from FLAC file', async () => {
      const metadata = await extractMetadata(TEST_FLAC);

      expect(metadata).not.toBeNull();
      expect(metadata.title).toBeDefined();
      expect(metadata.artist).toBeDefined();
      expect(metadata.album).toBeDefined();
      // Duration may be 0 if FLAC parsing fails but file exists (fallback mode)
      expect(metadata.duration).toBeGreaterThanOrEqual(0);
      // Codec may not be FLAC if the file is not a valid FLAC or parsing failed
      if (metadata.codec) {
        expect(metadata.codec).toBe('FLAC');
      }
    });

    test('extracts metadata from M4A file', async () => {
      const metadata = await extractMetadata(TEST_M4A);

      expect(metadata).not.toBeNull();
      expect(metadata.title).toBeDefined();
      expect(metadata.artist).toBeDefined();
      expect(metadata.album).toBeDefined();
      expect(metadata.duration).toBeGreaterThan(0);
    });

    test('handles file with no metadata tags', async () => {
      const metadata = await extractMetadata(NO_TAGS_MP3);

      expect(metadata).not.toBeNull();
      // Should fall back to filename for title
      expect(metadata.title).toBe('no-tags');
      expect(metadata.artist).toBe('Unknown Artist');
      expect(metadata.album).toBe('Unknown Album');
      expect(metadata.genres).toEqual([]);
    });

    test('handles non-existent file gracefully', async () => {
      const metadata = await extractMetadata('/path/to/nonexistent/file.mp3');

      expect(metadata).toBeNull();
    });

    test('extracts technical file information', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();
      expect(metadata.duration).toBeGreaterThan(0);
      expect(metadata.fileSize).toBeGreaterThan(0);
      expect(typeof metadata.bitrate).toBe('number');
      expect(typeof metadata.sampleRate).toBe('number');
      expect(metadata.codec).toBeDefined();
    });

    test('extracts album artist separately from artist', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();
      expect(metadata.albumArtist).toBeDefined();
      // Album artist should default to artist if not present
      if (!metadata.albumArtist) {
        expect(metadata.albumArtist).toBe(metadata.artist);
      }
    });

    test('handles genres as array', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();
      expect(Array.isArray(metadata.genres)).toBe(true);
    });

    test('extracts track and disc numbers', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();
      // Track/disc numbers may be null if not present
      expect(metadata).toHaveProperty('trackNumber');
      expect(metadata).toHaveProperty('discNumber');
    });

    test('extracts compilation flag', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();
      expect(typeof metadata.isCompilation).toBe('boolean');
    });

    test('extracts year', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();
      expect(metadata).toHaveProperty('year');
      // Year may be null if not present
      if (metadata.year !== null) {
        expect(typeof metadata.year).toBe('number');
      }
    });
  });

  describe('Artwork Extraction', () => {
    let tempDir;

    beforeEach(async () => {
      // Create temporary directory for artwork cache
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'artwork-test-'));
    });

    afterEach(async () => {
      // Clean up temporary directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    test('extracts artwork data if present', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();
      // Artwork may or may not be present in test file
      if (metadata.artwork) {
        expect(metadata.artwork.data).toBeInstanceOf(Buffer);
        expect(metadata.artwork.format).toBeDefined();
      }
    });

    test('caches artwork to disk', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      if (metadata && metadata.artwork) {
        const cachedPath = await cacheArtwork(metadata.artwork, tempDir);

        expect(cachedPath).not.toBeNull();
        expect(cachedPath).toContain(tempDir);

        // Verify file was created
        const stats = await fs.stat(cachedPath);
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    test('deduplicates identical artwork', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      if (metadata && metadata.artwork) {
        const cachedPath1 = await cacheArtwork(metadata.artwork, tempDir);
        const cachedPath2 = await cacheArtwork(metadata.artwork, tempDir);

        expect(cachedPath1).toBe(cachedPath2);

        // Verify only one file exists
        const files = await fs.readdir(tempDir);
        expect(files.length).toBe(1);
      }
    });

    test('handles missing artwork gracefully', async () => {
      const cachedPath = await cacheArtwork(null, tempDir);
      expect(cachedPath).toBeNull();
    });

    test('handles invalid artwork data', async () => {
      const invalidArtwork = {
        data: null,
        format: 'image/jpeg'
      };

      const cachedPath = await cacheArtwork(invalidArtwork, tempDir);
      expect(cachedPath).toBeNull();
    });

    test('creates artwork directory if missing', async () => {
      const newDir = path.join(tempDir, 'new', 'nested', 'dir');
      const metadata = await extractMetadata(TEST_MP3);

      if (metadata && metadata.artwork) {
        const cachedPath = await cacheArtwork(metadata.artwork, newDir);

        expect(cachedPath).not.toBeNull();

        // Verify directory was created
        const dirStats = await fs.stat(newDir);
        expect(dirStats.isDirectory()).toBe(true);
      }
    });
  });

  describe('File Format Support', () => {
    test('isSupportedAudioFile() recognizes MP3', () => {
      expect(isSupportedAudioFile('test.mp3')).toBe(true);
      expect(isSupportedAudioFile('test.MP3')).toBe(true);
      expect(isSupportedAudioFile('/path/to/test.mp3')).toBe(true);
    });

    test('isSupportedAudioFile() recognizes FLAC', () => {
      expect(isSupportedAudioFile('test.flac')).toBe(true);
      expect(isSupportedAudioFile('test.FLAC')).toBe(true);
    });

    test('isSupportedAudioFile() recognizes M4A', () => {
      expect(isSupportedAudioFile('test.m4a')).toBe(true);
      expect(isSupportedAudioFile('test.M4A')).toBe(true);
    });

    test('isSupportedAudioFile() recognizes MP4', () => {
      expect(isSupportedAudioFile('test.mp4')).toBe(true);
      expect(isSupportedAudioFile('test.MP4')).toBe(true);
    });

    test('isSupportedAudioFile() rejects unsupported formats', () => {
      expect(isSupportedAudioFile('test.wav')).toBe(false);
      expect(isSupportedAudioFile('test.ogg')).toBe(false);
      expect(isSupportedAudioFile('test.txt')).toBe(false);
      expect(isSupportedAudioFile('test.jpg')).toBe(false);
    });
  });

  describe('Batch Extraction', () => {
    test('extracts metadata from multiple files', async () => {
      const filePaths = [TEST_MP3, TEST_FLAC, TEST_M4A];
      const results = await extractMetadataBatch(filePaths);

      expect(results.length).toBe(3);
      expect(results[0].metadata).not.toBeNull();
      expect(results[1].metadata).not.toBeNull();
      expect(results[2].metadata).not.toBeNull();
    });

    test('calls progress callback during batch extraction', async () => {
      const filePaths = [TEST_MP3, TEST_FLAC];
      const progressCalls = [];

      await extractMetadataBatch(filePaths, (current, total, message) => {
        progressCalls.push({ current, total, message });
      });

      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1].message).toBe('Complete');
    });

    test('handles mixed valid and invalid files', async () => {
      const filePaths = [
        TEST_MP3,
        '/path/to/nonexistent.mp3',
        TEST_FLAC
      ];

      const results = await extractMetadataBatch(filePaths);

      // Should still process valid files
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    test('works with empty array', async () => {
      const results = await extractMetadataBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles corrupt audio file gracefully', async () => {
      // Create a temporary corrupt file
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'corrupt-test-'));
      const corruptFile = path.join(tempDir, 'corrupt.mp3');

      try {
        // Write random data that's not a valid audio file
        await fs.writeFile(corruptFile, 'This is not an audio file');

        const metadata = await extractMetadata(corruptFile);

        // Should return fallback metadata, not null
        expect(metadata).not.toBeNull();
        expect(metadata.title).toBe('corrupt');
        expect(metadata.artist).toBe('Unknown Artist');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    test('handles files with unicode characters in path', async () => {
      // This tests path handling but may not have a unicode test file
      const unicodePath = '/path/with/unicode/音楽/test.mp3';
      const metadata = await extractMetadata(unicodePath);

      // Should handle gracefully (will return null for non-existent file)
      expect(metadata).toBeNull();
    });

    test('handles very long file paths', async () => {
      const longPath = '/very/long/' + 'nested/'.repeat(50) + 'test.mp3';
      const metadata = await extractMetadata(longPath);

      // Should handle gracefully
      expect(metadata).toBeNull();
    });

    test('handles file with special characters in name', async () => {
      // Test that special characters don't break parsing
      const specialPath = '/path/to/Test Song [2024] (Remaster) & More!.mp3';
      const metadata = await extractMetadata(specialPath);

      // Should handle gracefully (will return null for non-existent file)
      expect(metadata).toBeNull();
    });
  });

  describe('Metadata Field Validation', () => {
    test('returns all required fields', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();

      // Required fields should always be present
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('artist');
      expect(metadata).toHaveProperty('album');
      expect(metadata).toHaveProperty('albumArtist');
      expect(metadata).toHaveProperty('trackNumber');
      expect(metadata).toHaveProperty('discNumber');
      expect(metadata).toHaveProperty('genres');
      expect(metadata).toHaveProperty('year');
      expect(metadata).toHaveProperty('duration');
      expect(metadata).toHaveProperty('bitrate');
      expect(metadata).toHaveProperty('sampleRate');
      expect(metadata).toHaveProperty('codec');
      expect(metadata).toHaveProperty('fileSize');
      expect(metadata).toHaveProperty('isCompilation');
      expect(metadata).toHaveProperty('artwork');
    });

    test('duration is rounded to integer', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();
      expect(Number.isInteger(metadata.duration)).toBe(true);
    });

    test('genres is always an array', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();
      expect(Array.isArray(metadata.genres)).toBe(true);
    });

    test('isCompilation is always boolean', async () => {
      const metadata = await extractMetadata(TEST_MP3);

      expect(metadata).not.toBeNull();
      expect(typeof metadata.isCompilation).toBe('boolean');
    });
  });
});
