// Database wrapper for music library
// Full implementation with complete schema and CRUD operations

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

class MusicDatabase {
  constructor(dbPath = ':memory:') {
    // If dbPath is not :memory:, ensure directory exists
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL'); // Better performance for concurrent reads
  }

  /**
   * Initialize database schema with all tables, indexes, and triggers
   */
  initialize() {
    // Use a transaction for schema creation
    const transaction = this.db.transaction(() => {
      // Create tracks table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tracks (
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
          date_added INTEGER NOT NULL,
          date_modified INTEGER,
          is_compilation BOOLEAN DEFAULT 0,
          artwork_path TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      // Create indexes for tracks
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
        CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
        CREATE INDEX IF NOT EXISTS idx_tracks_album_artist ON tracks(album_artist);
        CREATE INDEX IF NOT EXISTS idx_tracks_date_added ON tracks(date_added);
      `);

      // Create genres table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS genres (
          genre_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_genres_name ON genres(name);
      `);

      // Create track_genres junction table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS track_genres (
          track_id INTEGER NOT NULL,
          genre_id INTEGER NOT NULL,
          PRIMARY KEY (track_id, genre_id),
          FOREIGN KEY (track_id) REFERENCES tracks(track_id) ON DELETE CASCADE,
          FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE
        );
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_track_genres_track ON track_genres(track_id);
        CREATE INDEX IF NOT EXISTS idx_track_genres_genre ON track_genres(genre_id);
      `);

      // Create playlists table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS playlists (
          playlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          artwork_path TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      // Create playlist_tracks junction table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS playlist_tracks (
          playlist_id INTEGER NOT NULL,
          track_id INTEGER NOT NULL,
          position INTEGER NOT NULL,
          added_at INTEGER DEFAULT (strftime('%s', 'now')),
          PRIMARY KEY (playlist_id, track_id),
          FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE,
          FOREIGN KEY (track_id) REFERENCES tracks(track_id) ON DELETE CASCADE
        );
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);
      `);

      // Create albums table (cached/computed for performance)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS albums (
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
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(album_artist);
        CREATE INDEX IF NOT EXISTS idx_albums_title ON albums(album_title);
      `);

      // Create trigger for updated_at on tracks
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS tracks_updated_at
        AFTER UPDATE ON tracks
        FOR EACH ROW
        BEGIN
          UPDATE tracks SET updated_at = strftime('%s', 'now')
          WHERE track_id = NEW.track_id;
        END;
      `);

      // Create trigger for updated_at on playlists
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS playlists_updated_at
        AFTER UPDATE ON playlists
        FOR EACH ROW
        BEGIN
          UPDATE playlists SET updated_at = strftime('%s', 'now')
          WHERE playlist_id = NEW.playlist_id;
        END;
      `);

      // Create schema_version table for migrations
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      // Insert initial schema version
      this.db.exec(`
        INSERT OR IGNORE INTO schema_version (version) VALUES (1);
      `);
    });

    transaction();
  }

  // ==================== TRACK OPERATIONS ====================

  /**
   * Insert a new track into the database
   * @param {Object} track - Track metadata
   * @returns {Object} Result with track_id
   */
  insertTrack(track) {
    const stmt = this.db.prepare(`
      INSERT INTO tracks (
        file_path, title, artist, album, album_artist,
        track_number, disc_number, release_year,
        duration_seconds, bitrate, sample_rate, codec,
        file_size_bytes, date_added, date_modified,
        is_compilation, artwork_path
      ) VALUES (
        @file_path, @title, @artist, @album, @album_artist,
        @track_number, @disc_number, @release_year,
        @duration_seconds, @bitrate, @sample_rate, @codec,
        @file_size_bytes, @date_added, @date_modified,
        @is_compilation, @artwork_path
      )
    `);

    const result = stmt.run({
      file_path: track.file_path,
      title: track.title,
      artist: track.artist || null,
      album: track.album || null,
      album_artist: track.album_artist || null,
      track_number: track.track_number || null,
      disc_number: track.disc_number || null,
      release_year: track.release_year || null,
      duration_seconds: track.duration_seconds || null,
      bitrate: track.bitrate || null,
      sample_rate: track.sample_rate || null,
      codec: track.codec || null,
      file_size_bytes: track.file_size_bytes || null,
      date_added: track.date_added,
      date_modified: track.date_modified || null,
      is_compilation: track.is_compilation ? 1 : 0,
      artwork_path: track.artwork_path || null
    });

    return { track_id: result.lastInsertRowid };
  }

  /**
   * Get a track by ID
   * @param {number} trackId - Track ID
   * @returns {Object|undefined} Track object or undefined
   */
  getTrack(trackId) {
    const stmt = this.db.prepare('SELECT * FROM tracks WHERE track_id = ?');
    return stmt.get(trackId);
  }

  /**
   * Get all tracks with optional filters and sorting
   * @param {Object} options - Query options
   * @returns {Array} Array of track objects
   */
  getTracks(options = {}) {
    let query = 'SELECT * FROM tracks';
    const conditions = [];
    const params = {};

    if (options.artist) {
      conditions.push('artist = @artist');
      params.artist = options.artist;
    }

    if (options.album) {
      conditions.push('album = @album');
      params.album = options.album;
    }

    if (options.album_artist) {
      conditions.push('album_artist = @album_artist');
      params.album_artist = options.album_artist;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add sorting
    const sortBy = options.sortBy || 'title';
    const sortOrder = options.sortOrder || 'ASC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    const stmt = this.db.prepare(query);
    return stmt.all(params);
  }

  /**
   * Update track metadata
   * @param {number} trackId - Track ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Result info
   */
  updateTrack(trackId, updates) {
    const fields = [];
    const params = { track_id: trackId };

    const allowedFields = [
      'title', 'artist', 'album', 'album_artist',
      'track_number', 'disc_number', 'release_year',
      'is_compilation', 'artwork_path'
    ];

    allowedFields.forEach(field => {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = @${field}`);
        params[field] = updates[field];
      }
    });

    if (fields.length === 0) {
      return { changes: 0 };
    }

    const query = `UPDATE tracks SET ${fields.join(', ')} WHERE track_id = @track_id`;
    const stmt = this.db.prepare(query);
    const result = stmt.run(params);

    return { changes: result.changes };
  }

  /**
   * Delete a track
   * @param {number} trackId - Track ID
   * @returns {Object} Result info
   */
  deleteTrack(trackId) {
    const stmt = this.db.prepare('DELETE FROM tracks WHERE track_id = ?');
    const result = stmt.run(trackId);
    return { changes: result.changes };
  }

  // ==================== GENRE OPERATIONS ====================

  /**
   * Get or create a genre by name
   * @param {string} name - Genre name
   * @returns {number} genre_id
   */
  getOrCreateGenre(name) {
    // Try to get existing genre
    const getStmt = this.db.prepare('SELECT genre_id FROM genres WHERE name = ?');
    const existing = getStmt.get(name);

    if (existing) {
      return existing.genre_id;
    }

    // Create new genre
    const insertStmt = this.db.prepare('INSERT INTO genres (name) VALUES (?)');
    const result = insertStmt.run(name);
    return result.lastInsertRowid;
  }

  /**
   * Add genres to a track
   * @param {number} trackId - Track ID
   * @param {Array<string>} genreNames - Array of genre names
   */
  addTrackGenres(trackId, genreNames) {
    if (!genreNames || genreNames.length === 0) return;

    const transaction = this.db.transaction(() => {
      genreNames.forEach(name => {
        const genreId = this.getOrCreateGenre(name);
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO track_genres (track_id, genre_id)
          VALUES (?, ?)
        `);
        stmt.run(trackId, genreId);
      });
    });

    transaction();
  }

  /**
   * Get genres for a track
   * @param {number} trackId - Track ID
   * @returns {Array<string>} Array of genre names
   */
  getTrackGenres(trackId) {
    const stmt = this.db.prepare(`
      SELECT g.name
      FROM genres g
      JOIN track_genres tg ON g.genre_id = tg.genre_id
      WHERE tg.track_id = ?
      ORDER BY g.name
    `);
    return stmt.all(trackId).map(row => row.name);
  }

  /**
   * Remove all genres from a track
   * @param {number} trackId - Track ID
   */
  clearTrackGenres(trackId) {
    const stmt = this.db.prepare('DELETE FROM track_genres WHERE track_id = ?');
    stmt.run(trackId);
  }

  /**
   * Get all genres
   * @returns {Array} Array of genre objects
   */
  getAllGenres() {
    const stmt = this.db.prepare('SELECT * FROM genres ORDER BY name');
    return stmt.all();
  }

  // ==================== PLAYLIST OPERATIONS ====================

  /**
   * Create a new playlist
   * @param {Object} playlist - Playlist data
   * @returns {Object} Result with playlist_id
   */
  createPlaylist(playlist) {
    const stmt = this.db.prepare(`
      INSERT INTO playlists (name, description, artwork_path)
      VALUES (@name, @description, @artwork_path)
    `);

    const result = stmt.run({
      name: playlist.name,
      description: playlist.description || null,
      artwork_path: playlist.artwork_path || null
    });

    return { playlist_id: result.lastInsertRowid };
  }

  /**
   * Get a playlist by ID
   * @param {number} playlistId - Playlist ID
   * @returns {Object|undefined} Playlist object
   */
  getPlaylist(playlistId) {
    const stmt = this.db.prepare('SELECT * FROM playlists WHERE playlist_id = ?');
    return stmt.get(playlistId);
  }

  /**
   * Get all playlists
   * @returns {Array} Array of playlist objects
   */
  getAllPlaylists() {
    const stmt = this.db.prepare('SELECT * FROM playlists ORDER BY name');
    return stmt.all();
  }

  /**
   * Update playlist metadata
   * @param {number} playlistId - Playlist ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Result info
   */
  updatePlaylist(playlistId, updates) {
    const fields = [];
    const params = { playlist_id: playlistId };

    const allowedFields = ['name', 'description', 'artwork_path'];

    allowedFields.forEach(field => {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = @${field}`);
        params[field] = updates[field];
      }
    });

    if (fields.length === 0) {
      return { changes: 0 };
    }

    const query = `UPDATE playlists SET ${fields.join(', ')} WHERE playlist_id = @playlist_id`;
    const stmt = this.db.prepare(query);
    const result = stmt.run(params);

    return { changes: result.changes };
  }

  /**
   * Delete a playlist
   * @param {number} playlistId - Playlist ID
   * @returns {Object} Result info
   */
  deletePlaylist(playlistId) {
    const stmt = this.db.prepare('DELETE FROM playlists WHERE playlist_id = ?');
    const result = stmt.run(playlistId);
    return { changes: result.changes };
  }

  /**
   * Add tracks to playlist
   * @param {number} playlistId - Playlist ID
   * @param {Array<number>} trackIds - Array of track IDs
   */
  addTracksToPlaylist(playlistId, trackIds) {
    if (!trackIds || trackIds.length === 0) return;

    const transaction = this.db.transaction(() => {
      // Get current max position
      const maxPosStmt = this.db.prepare(`
        SELECT COALESCE(MAX(position), 0) as max_pos
        FROM playlist_tracks
        WHERE playlist_id = ?
      `);
      let position = maxPosStmt.get(playlistId).max_pos;

      const insertStmt = this.db.prepare(`
        INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position)
        VALUES (?, ?, ?)
      `);

      trackIds.forEach(trackId => {
        position++;
        insertStmt.run(playlistId, trackId, position);
      });
    });

    transaction();
  }

  /**
   * Get tracks in a playlist
   * @param {number} playlistId - Playlist ID
   * @returns {Array} Array of track objects with position
   */
  getPlaylistTracks(playlistId) {
    const stmt = this.db.prepare(`
      SELECT t.*, pt.position
      FROM tracks t
      JOIN playlist_tracks pt ON t.track_id = pt.track_id
      WHERE pt.playlist_id = ?
      ORDER BY pt.position
    `);
    return stmt.all(playlistId);
  }

  /**
   * Remove track from playlist
   * @param {number} playlistId - Playlist ID
   * @param {number} trackId - Track ID
   * @returns {Object} Result info
   */
  removeTrackFromPlaylist(playlistId, trackId) {
    const stmt = this.db.prepare(`
      DELETE FROM playlist_tracks
      WHERE playlist_id = ? AND track_id = ?
    `);
    const result = stmt.run(playlistId, trackId);
    return { changes: result.changes };
  }

  // ==================== ALBUM OPERATIONS ====================

  /**
   * Get or create an album
   * @param {Object} albumData - Album data
   * @returns {number} album_id
   */
  getOrCreateAlbum(albumData) {
    const getStmt = this.db.prepare(`
      SELECT album_id FROM albums
      WHERE album_title = ? AND album_artist = ?
    `);
    const existing = getStmt.get(albumData.album_title, albumData.album_artist || null);

    if (existing) {
      return existing.album_id;
    }

    const insertStmt = this.db.prepare(`
      INSERT INTO albums (album_title, album_artist, release_year, artwork_path, is_compilation)
      VALUES (@album_title, @album_artist, @release_year, @artwork_path, @is_compilation)
    `);

    const result = insertStmt.run({
      album_title: albumData.album_title,
      album_artist: albumData.album_artist || null,
      release_year: albumData.release_year || null,
      artwork_path: albumData.artwork_path || null,
      is_compilation: albumData.is_compilation ? 1 : 0
    });

    return result.lastInsertRowid;
  }

  /**
   * Get all albums
   * @returns {Array} Array of album objects
   */
  getAllAlbums() {
    const stmt = this.db.prepare('SELECT * FROM albums ORDER BY album_title');
    return stmt.all();
  }

  /**
   * Update album track count
   * @param {number} albumId - Album ID
   */
  updateAlbumTrackCount(albumId) {
    const stmt = this.db.prepare(`
      UPDATE albums
      SET track_count = (
        SELECT COUNT(*)
        FROM tracks
        WHERE album = (SELECT album_title FROM albums WHERE album_id = ?)
          AND album_artist = (SELECT album_artist FROM albums WHERE album_id = ?)
      )
      WHERE album_id = ?
    `);
    stmt.run(albumId, albumId, albumId);
  }

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Get database statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const stats = {};

    const trackCount = this.db.prepare('SELECT COUNT(*) as count FROM tracks').get();
    stats.tracks = trackCount.count;

    const albumCount = this.db.prepare('SELECT COUNT(*) as count FROM albums').get();
    stats.albums = albumCount.count;

    const playlistCount = this.db.prepare('SELECT COUNT(*) as count FROM playlists').get();
    stats.playlists = playlistCount.count;

    const genreCount = this.db.prepare('SELECT COUNT(*) as count FROM genres').get();
    stats.genres = genreCount.count;

    return stats;
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }

  /**
   * Get the current schema version
   * @returns {number} Schema version
   */
  getSchemaVersion() {
    const stmt = this.db.prepare('SELECT MAX(version) as version FROM schema_version');
    const result = stmt.get();
    return result.version || 0;
  }

  /**
   * Run a database migration
   * @param {number} version - Target version
   * @param {Function} migrationFn - Migration function
   */
  migrate(version, migrationFn) {
    const currentVersion = this.getSchemaVersion();

    if (currentVersion >= version) {
      return; // Already at or past this version
    }

    const transaction = this.db.transaction(() => {
      migrationFn(this.db);

      // Record migration
      const stmt = this.db.prepare('INSERT INTO schema_version (version) VALUES (?)');
      stmt.run(version);
    });

    transaction();
  }
}

module.exports = MusicDatabase;
