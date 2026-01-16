/**
 * Music Import Pipeline
 *
 * Handles the complete import process:
 * 1. Folder scanning for audio files
 * 2. Metadata extraction
 * 3. File copying to managed library
 * 4. Artwork caching
 * 5. Database insertion
 * 6. Progress tracking
 */

const fs = require('fs').promises;
const path = require('path');
const { extractMetadata, cacheArtwork, isSupportedAudioFile } = require('./metadata');
const LibraryManager = require('./library-manager');

/**
 * Recursively scan a folder for audio files
 *
 * @param {string} folderPath - Path to folder to scan
 * @param {Function} onProgress - Optional progress callback (current, message)
 * @returns {Promise<string[]>} Array of audio file paths
 */
async function scanFolder(folderPath, onProgress = null) {
  const audioFiles = [];

  async function walk(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await walk(fullPath);
        } else if (entry.isFile()) {
          // Check if file is a supported audio format
          if (isSupportedAudioFile(fullPath)) {
            audioFiles.push(fullPath);

            if (onProgress) {
              onProgress(audioFiles.length, `Found: ${entry.name}`);
            }
          }
        }
      }
    } catch (error) {
      // Log error but continue scanning
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  }

  await walk(folderPath);
  return audioFiles;
}

/**
 * Import files into the library
 *
 * @param {string[]} filePaths - Array of file paths to import
 * @param {Object} database - Database instance
 * @param {LibraryManager} libraryManager - Library manager instance
 * @param {Object} options - Import options
 * @param {Function} options.onProgress - Progress callback (processed, total, message, status)
 * @param {Function} options.onError - Error callback (filePath, error)
 * @param {Object} options.cancelToken - Object with 'cancelled' boolean property
 * @returns {Promise<Object>} Import results
 */
async function importFiles(filePaths, database, libraryManager, options = {}) {
  const {
    onProgress = null,
    onError = null,
    cancelToken = { cancelled: false }
  } = options;

  const results = {
    total: filePaths.length,
    imported: 0,
    skipped: 0,
    errors: 0,
    duplicates: 0,
    importedTracks: []
  };

  for (let i = 0; i < filePaths.length; i++) {
    // Check if import was cancelled
    if (cancelToken.cancelled) {
      if (onProgress) {
        onProgress(i, results.total, 'Import cancelled', 'cancelled');
      }
      break;
    }

    const filePath = filePaths[i];
    const filename = path.basename(filePath);

    try {
      // Report progress - starting file
      if (onProgress) {
        onProgress(i, results.total, `Processing: ${filename}`, 'processing');
      }

      // Extract metadata
      const metadata = await extractMetadata(filePath);

      if (!metadata) {
        results.skipped++;
        if (onProgress) {
          onProgress(i + 1, results.total, `Skipped: ${filename} (no metadata)`, 'skipped');
        }
        continue;
      }

      // Generate destination path
      const destPath = libraryManager.generateTrackPath({
        artist: metadata.artist,
        album: metadata.album,
        album_artist: metadata.albumArtist,
        title: metadata.title,
        track_number: metadata.trackNumber,
        file_path: filePath
      });

      // Check for duplicates - check if destination file already exists
      try {
        await fs.access(destPath);
        // File exists at destination, it's a duplicate
        results.duplicates++;
        if (onProgress) {
          onProgress(i + 1, results.total, `Duplicate: ${filename}`, 'duplicate');
        }
        continue;
      } catch {
        // File doesn't exist, proceed with import
      }

      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });

      // Copy file to library
      await fs.copyFile(filePath, destPath);

      // Cache artwork if present
      let artworkPath = null;
      if (metadata.artwork) {
        artworkPath = await cacheArtwork(
          metadata.artwork,
          libraryManager.getAlbumsArtworkPath()
        );
      }

      // Prepare track data for database
      const trackData = {
        file_path: destPath,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        album_artist: metadata.albumArtist,
        track_number: metadata.trackNumber,
        disc_number: metadata.discNumber,
        release_year: metadata.year,
        duration_seconds: metadata.duration,
        bitrate: metadata.bitrate,
        sample_rate: metadata.sampleRate,
        codec: metadata.codec,
        file_size_bytes: metadata.fileSize,
        is_compilation: metadata.isCompilation,
        artwork_path: artworkPath,
        date_added: Math.floor(Date.now() / 1000) // Unix timestamp in seconds
      };

      // Insert into database
      const result = database.insertTrack(trackData);
      const trackId = result.track_id;

      // Add genres if present
      if (metadata.genres && metadata.genres.length > 0) {
        database.addTrackGenres(trackId, metadata.genres);
      }

      results.imported++;
      results.importedTracks.push({
        trackId,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album
      });

      if (onProgress) {
        onProgress(i + 1, results.total, `Imported: ${metadata.title}`, 'imported');
      }

    } catch (error) {
      results.errors++;

      console.error(`Import failed for ${filePath}:`, error.message);

      if (onError) {
        onError(filePath, error);
      }

      if (onProgress) {
        onProgress(i + 1, results.total, `Error: ${filename}`, 'error');
      }
    }
  }

  return results;
}

/**
 * Import a folder (combines scanning and importing)
 *
 * @param {string} folderPath - Path to folder to import
 * @param {Object} database - Database instance
 * @param {LibraryManager} libraryManager - Library manager instance
 * @param {Object} options - Import options
 * @returns {Promise<Object>} Import results
 */
async function importFolder(folderPath, database, libraryManager, options = {}) {
  const { onProgress = null } = options;

  // Phase 1: Scan for files
  if (onProgress) {
    onProgress(0, 0, 'Scanning folder...', 'scanning');
  }

  const audioFiles = await scanFolder(folderPath, (count, message) => {
    if (onProgress) {
      onProgress(0, count, message, 'scanning');
    }
  });

  if (audioFiles.length === 0) {
    return {
      total: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      duplicates: 0,
      importedTracks: []
    };
  }

  // Phase 2: Import files
  if (onProgress) {
    onProgress(0, audioFiles.length, `Found ${audioFiles.length} files. Starting import...`, 'importing');
  }

  return await importFiles(audioFiles, database, libraryManager, options);
}

/**
 * Validate import prerequisites
 *
 * @param {Object} database - Database instance
 * @param {LibraryManager} libraryManager - Library manager instance
 * @returns {Promise<Object>} Validation result with { valid: boolean, errors: string[] }
 */
async function validateImportPrerequisites(database, libraryManager) {
  const errors = [];

  // Check library manager exists
  if (!libraryManager) {
    errors.push('Library manager not initialized');
  } else {
    // Check library folder permissions
    const hasPermissions = await libraryManager.verifyPermissions();
    if (!hasPermissions) {
      errors.push('Library folder permissions invalid');
    }
  }

  // Check database exists and is initialized
  if (!database) {
    errors.push('Database not initialized');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  scanFolder,
  importFiles,
  importFolder,
  validateImportPrerequisites
};
