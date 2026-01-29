/**
 * Music Metadata Extraction Module
 *
 * Extracts metadata from audio files (MP3, FLAC, M4A/MP4) using the music-metadata library.
 * Handles tag extraction, artwork, and technical file information.
 *
 * Supported formats:
 * - MP3 (ID3v1, ID3v2.2, ID3v2.3, ID3v2.4)
 * - FLAC (Vorbis Comments)
 * - M4A/MP4 (iTunes-style atoms)
 */

const mm = require('music-metadata');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Security: Artwork validation configuration
const ARTWORK_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB max
  validMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  magicBytes: {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/jpg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
    'image/gif': [0x47, 0x49, 0x46] // GIF
  }
};

/**
 * Validate artwork data for security
 *
 * @param {Object} artwork - Artwork object with data and format
 * @returns {Object} Validation result { valid: boolean, reason?: string }
 */
function validateArtwork(artwork) {
  if (!artwork || !artwork.data) {
    return { valid: false, reason: 'No artwork data' };
  }

  // Check file size
  if (artwork.data.length > ARTWORK_CONFIG.maxSize) {
    return {
      valid: false,
      reason: `Artwork exceeds maximum size of ${ARTWORK_CONFIG.maxSize / 1024 / 1024}MB`
    };
  }

  // Check MIME type
  const format = artwork.format || 'unknown';
  if (!ARTWORK_CONFIG.validMimeTypes.includes(format)) {
    return { valid: false, reason: `Invalid artwork format: ${format}` };
  }

  // Verify magic bytes match claimed format
  const expectedMagic = ARTWORK_CONFIG.magicBytes[format];
  if (expectedMagic) {
    for (let i = 0; i < expectedMagic.length; i++) {
      if (artwork.data[i] !== expectedMagic[i]) {
        return {
          valid: false,
          reason: `Artwork magic bytes do not match claimed format ${format}`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Extract metadata from an audio file
 *
 * @param {string} filePath - Absolute path to audio file
 * @returns {Promise<Object|null>} Extracted metadata object or null if extraction fails
 */
async function extractMetadata(filePath) {
  try {
    // Get file stats for file size
    const stats = await fs.stat(filePath);

    // Parse file metadata
    const metadata = await mm.parseFile(filePath);

    // Extract basic tags with fallbacks
    const title = metadata.common.title || path.basename(filePath, path.extname(filePath));
    const artist = metadata.common.artist || 'Unknown Artist';
    const album = metadata.common.album || 'Unknown Album';
    const albumArtist = metadata.common.albumartist || metadata.common.artist || artist;

    // Handle genres - music-metadata returns an array
    let genres = [];
    if (metadata.common.genre && Array.isArray(metadata.common.genre)) {
      genres = metadata.common.genre;
    } else if (metadata.common.genre) {
      // Handle case where genre is a single string
      genres = [metadata.common.genre];
    }

    // Extract track and disc numbers (handle no/of format)
    const trackNumber = metadata.common.track?.no || null;
    const discNumber = metadata.common.disk?.no || null;

    // Extract year
    const year = metadata.common.year || null;

    // Extract technical information
    const duration = Math.round(metadata.format.duration || 0);
    const bitrate = metadata.format.bitrate || null;
    const sampleRate = metadata.format.sampleRate || null;
    const codec = metadata.format.codec || null;

    // Handle compilation flag
    const isCompilation = metadata.common.compilation || false;

    // Extract artwork (first picture if multiple exist)
    let artwork = null;
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      artwork = {
        data: picture.data,
        format: picture.format,
        type: picture.type,
        description: picture.description || ''
      };
    }

    return {
      title,
      artist,
      album,
      albumArtist,
      trackNumber,
      discNumber,
      genres,
      year,
      duration,
      bitrate,
      sampleRate,
      codec,
      fileSize: stats.size,
      isCompilation,
      artwork
    };

  } catch (error) {
    console.error(`Failed to extract metadata from ${filePath}:`, error.message);

    // Return minimal metadata using filename parsing for graceful degradation
    try {
      const stats = await fs.stat(filePath);
      return {
        title: path.basename(filePath, path.extname(filePath)),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        albumArtist: 'Unknown Artist',
        trackNumber: null,
        discNumber: null,
        genres: [],
        year: null,
        duration: 0,
        bitrate: null,
        sampleRate: null,
        codec: null,
        fileSize: stats.size,
        isCompilation: false,
        artwork: null
      };
    } catch (fallbackError) {
      console.error(`Complete failure to process ${filePath}:`, fallbackError.message);
      return null;
    }
  }
}

/**
 * Cache artwork to disk and return the cached file path
 *
 * @param {Object} artwork - Artwork object from metadata extraction
 * @param {string} artworkDir - Directory to save artwork files
 * @returns {Promise<string|null>} Path to cached artwork file or null
 */
async function cacheArtwork(artwork, artworkDir) {
  if (!artwork || !artwork.data) {
    return null;
  }

  // Security: Validate artwork before caching
  const validation = validateArtwork(artwork);
  if (!validation.valid) {
    console.warn(`Skipping invalid artwork: ${validation.reason}`);
    return null;
  }

  try {
    // Ensure artwork directory exists
    await fs.mkdir(artworkDir, { recursive: true });

    // Generate hash-based filename to deduplicate
    const hash = crypto.createHash('sha256').update(artwork.data).digest('hex');
    const extension = getArtworkExtension(artwork.format);
    const filename = `${hash}${extension}`;
    const artworkPath = path.join(artworkDir, filename);

    // Check if artwork already exists (deduplication)
    try {
      await fs.access(artworkPath);
      // File exists, return path
      return artworkPath;
    } catch {
      // File doesn't exist, write it
      await fs.writeFile(artworkPath, artwork.data);
      return artworkPath;
    }

  } catch (error) {
    console.error('Failed to cache artwork:', error.message);
    return null;
  }
}

/**
 * Get file extension for artwork format
 *
 * @param {string} format - MIME type or format string
 * @returns {string} File extension with dot
 */
function getArtworkExtension(format) {
  const formatMap = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/webp': '.webp'
  };

  return formatMap[format] || '.jpg';
}

/**
 * Check if file is a supported audio format
 *
 * @param {string} filePath - Path to file
 * @returns {boolean} True if file extension is supported
 */
function isSupportedAudioFile(filePath) {
  const supportedExtensions = ['.mp3', '.flac', '.m4a', '.mp4'];
  const ext = path.extname(filePath).toLowerCase();
  return supportedExtensions.includes(ext);
}

/**
 * Extract metadata from multiple files with progress callback
 *
 * @param {string[]} filePaths - Array of file paths
 * @param {Function} onProgress - Callback function (current, total, message)
 * @returns {Promise<Object[]>} Array of metadata objects
 */
async function extractMetadataBatch(filePaths, onProgress = null) {
  const results = [];
  const total = filePaths.length;

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];

    if (onProgress) {
      onProgress(i, total, `Processing: ${path.basename(filePath)}`);
    }

    const metadata = await extractMetadata(filePath);

    if (metadata) {
      results.push({
        filePath,
        metadata
      });
    }
  }

  if (onProgress) {
    onProgress(total, total, 'Complete');
  }

  return results;
}

module.exports = {
  extractMetadata,
  cacheArtwork,
  isSupportedAudioFile,
  extractMetadataBatch
};
