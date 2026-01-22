// Library folder structure management
// Handles creation and management of the managed library folder structure

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class LibraryManager {
  /**
   * Create a new LibraryManager instance
   * @param {string} libraryPath - Base path for library (defaults to ~/Music/Tuuuuunes)
   */
  constructor(libraryPath = null) {
    this.libraryPath = libraryPath || this.getDefaultLibraryPath();
  }

  /**
   * Get the default library path
   * @returns {string} Default library path
   */
  getDefaultLibraryPath() {
    const homeDir = os.homedir();
    return path.join(homeDir, 'Music', 'Tuuuuunes');
  }

  /**
   * Get the music folder path
   * @returns {string} Music folder path
   */
  getMusicPath() {
    return path.join(this.libraryPath, 'Music');
  }

  /**
   * Get the artwork folder path
   * @returns {string} Artwork folder path
   */
  getArtworkPath() {
    return path.join(this.libraryPath, 'Artwork');
  }

  /**
   * Get the albums artwork folder path
   * @returns {string} Albums artwork folder path
   */
  getAlbumsArtworkPath() {
    return path.join(this.getArtworkPath(), 'albums');
  }

  /**
   * Get the playlists artwork folder path
   * @returns {string} Playlists artwork folder path
   */
  getPlaylistsArtworkPath() {
    return path.join(this.getArtworkPath(), 'playlists');
  }

  /**
   * Get the database folder path
   * @returns {string} Database folder path
   */
  getDatabasePath() {
    return path.join(this.libraryPath, 'Database');
  }

  /**
   * Get the full database file path
   * @returns {string} Database file path
   */
  getDatabaseFilePath() {
    return path.join(this.getDatabasePath(), 'library.db');
  }

  /**
   * Initialize the library folder structure
   * Creates all necessary directories if they don't exist
   * @returns {Promise<void>}
   */
  async initialize() {
    const folders = [
      this.libraryPath,
      this.getMusicPath(),
      this.getArtworkPath(),
      this.getAlbumsArtworkPath(),
      this.getPlaylistsArtworkPath(),
      this.getDatabasePath()
    ];

    for (const folder of folders) {
      await fs.mkdir(folder, { recursive: true });
    }
  }

  /**
   * Check if the library folder structure exists
   * @returns {Promise<boolean>} True if library exists
   */
  async exists() {
    try {
      await fs.access(this.libraryPath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify read/write permissions for the library folder
   * @returns {Promise<boolean>} True if permissions are valid
   */
  async verifyPermissions() {
    try {
      // Check if library folder exists
      const libraryExists = await this.exists();

      if (!libraryExists) {
        // Try to create it to test write permissions
        await this.initialize();
      }

      // Test write permission
      await fs.access(this.libraryPath, fs.constants.W_OK);

      // Test read permission
      await fs.access(this.libraryPath, fs.constants.R_OK);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sanitize a filename by removing invalid characters
   * @param {string} filename - Filename to sanitize
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    // Handle null, undefined, or empty string
    if (!filename || (typeof filename === 'string' && filename.trim().length === 0)) {
      return 'Unknown';
    }

    // Remove invalid characters: / \ ? % * : | " < >
    let sanitized = filename.replace(/[/\\?%*:|"<>]/g, '');

    // Replace multiple spaces with single space
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Trim whitespace
    sanitized = sanitized.trim();

    // If empty after sanitization, use a default
    if (sanitized.length === 0) {
      sanitized = 'Unknown';
    }

    // Limit length to prevent filesystem issues (255 is common max)
    const maxLength = 200; // Leave room for extensions and numbering
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Generate a file path for a music track
   * @param {Object} metadata - Track metadata
   * @returns {string} Full file path for the track
   */
  generateTrackPath(metadata) {
    const artist = this.sanitizeFilename(metadata.artist || metadata.album_artist || 'Unknown Artist');
    const album = this.sanitizeFilename(metadata.album || 'Unknown Album');
    const trackNumber = metadata.track_number ? String(metadata.track_number).padStart(2, '0') : '00';
    const title = this.sanitizeFilename(metadata.title || 'Unknown Track');

    // Get file extension from original file path or codec
    let extension = '.mp3'; // default
    if (metadata.file_path) {
      extension = path.extname(metadata.file_path);
    } else if (metadata.codec) {
      extension = `.${metadata.codec}`;
    }

    const filename = `${trackNumber} ${title}${extension}`;

    return path.join(this.getMusicPath(), artist, album, filename);
  }

  /**
   * Hash data to generate a unique filename
   * @param {Buffer|string} data - Data to hash
   * @returns {string} Hash string
   */
  hashData(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Generate a path for artwork
   * @param {Buffer} artworkData - Artwork image data
   * @param {string} type - Type of artwork ('album' or 'playlist')
   * @returns {string} Full path for artwork file
   */
  generateArtworkPath(artworkData, type = 'album') {
    const hash = this.hashData(artworkData);
    const filename = `${hash}.jpg`;

    if (type === 'playlist') {
      return path.join(this.getPlaylistsArtworkPath(), filename);
    } else {
      return path.join(this.getAlbumsArtworkPath(), filename);
    }
  }

  /**
   * Save artwork to the library
   * @param {Buffer} artworkData - Artwork image data
   * @param {string} type - Type of artwork ('album' or 'playlist')
   * @returns {Promise<string>} Path to saved artwork
   */
  async saveArtwork(artworkData, type = 'album') {
    const artworkPath = this.generateArtworkPath(artworkData, type);

    // Check if artwork already exists (deduplication via hash)
    try {
      await fs.access(artworkPath, fs.constants.F_OK);
      // Already exists, return path
      return artworkPath;
    } catch (error) {
      // Doesn't exist, save it
      await fs.writeFile(artworkPath, artworkData);
      return artworkPath;
    }
  }

  /**
   * Get library statistics
   * @returns {Promise<Object>} Statistics about the library
   */
  async getStats() {
    const stats = {
      totalSize: 0,
      musicFiles: 0,
      artworkFiles: 0,
      exists: await this.exists()
    };

    if (!stats.exists) {
      return stats;
    }

    try {
      // Count music files
      const musicPath = this.getMusicPath();
      stats.musicFiles = await this.countFiles(musicPath, ['.mp3', '.flac', '.m4a', '.mp4']);

      // Count artwork files
      const artworkPath = this.getArtworkPath();
      stats.artworkFiles = await this.countFiles(artworkPath, ['.jpg', '.jpeg', '.png']);

      // Calculate total size
      stats.totalSize = await this.calculateDirectorySize(this.libraryPath);
    } catch (error) {
      // If there's an error, return stats as-is
    }

    return stats;
  }

  /**
   * Count files in a directory with specific extensions
   * @param {string} dirPath - Directory path
   * @param {Array<string>} extensions - File extensions to count
   * @returns {Promise<number>} Number of matching files
   */
  async countFiles(dirPath, extensions) {
    let count = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          count += await this.countFiles(fullPath, extensions);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            count++;
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return count;
  }

  /**
   * Calculate total size of a directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<number>} Total size in bytes
   */
  async calculateDirectorySize(dirPath) {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this.calculateDirectorySize(fullPath);
        } else if (entry.isFile()) {
          const stat = await fs.stat(fullPath);
          totalSize += stat.size;
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return totalSize;
  }

  /**
   * Format bytes to human-readable size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Validate a path string for security
   * Prevents path traversal attacks and access to sensitive directories
   * @param {string} pathStr - Path to validate
   * @returns {boolean} True if path is safe to access
   */
  isValidPath(pathStr) {
    if (!pathStr || typeof pathStr !== 'string') {
      return false;
    }

    // Check for null bytes (filesystem injection)
    if (pathStr.includes('\0')) {
      return false;
    }

    // Check if path is absolute
    if (!path.isAbsolute(pathStr)) {
      return false;
    }

    // Resolve the path to handle symlinks and relative components (../)
    const resolved = path.resolve(pathStr);
    const homeDir = os.homedir();

    // Only allow paths within the home directory
    if (!resolved.startsWith(homeDir)) {
      return false;
    }

    // Block sensitive directories within home
    const blockedDirs = [
      '.ssh',
      '.gnupg',
      '.config',
      '.local',
      '.cache',
      'Library/Keychains',
      'Library/Application Support/Keychain',
      '.aws',
      '.azure',
      '.kube'
    ];

    for (const blocked of blockedDirs) {
      const blockedPath = path.join(homeDir, blocked);
      if (resolved.startsWith(blockedPath)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Ensure a directory exists, create if needed
   * @param {string} dirPath - Directory path
   * @returns {Promise<void>}
   */
  async ensureDirectory(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

module.exports = LibraryManager;
