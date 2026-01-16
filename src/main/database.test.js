// Comprehensive database tests
const MusicDatabase = require('./database');

describe('MusicDatabase', () => {
  let db;

  beforeEach(() => {
    db = new MusicDatabase(':memory:');
    db.initialize();
  });

  afterEach(() => {
    db.close();
  });

  describe('Initialization', () => {
    test('creates all required tables', () => {
      const tables = db.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table'
        ORDER BY name
      `).all();

      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('tracks');
      expect(tableNames).toContain('genres');
      expect(tableNames).toContain('track_genres');
      expect(tableNames).toContain('playlists');
      expect(tableNames).toContain('playlist_tracks');
      expect(tableNames).toContain('albums');
      expect(tableNames).toContain('schema_version');
    });

    test('creates all indexes', () => {
      const indexes = db.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND name LIKE 'idx_%'
        ORDER BY name
      `).all();

      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_tracks_album');
      expect(indexNames).toContain('idx_tracks_artist');
      expect(indexNames).toContain('idx_tracks_album_artist');
      expect(indexNames).toContain('idx_genres_name');
    });

    test('sets initial schema version', () => {
      const version = db.getSchemaVersion();
      expect(version).toBe(1);
    });

    test('enables foreign keys', () => {
      const result = db.db.pragma('foreign_keys', { simple: true });
      expect(result).toBe(1);
    });
  });

  describe('Track Operations', () => {
    test('inserts track with complete metadata', () => {
      const track = {
        file_path: '/music/artist/album/track.mp3',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
        album_artist: 'Test Artist',
        track_number: 1,
        disc_number: 1,
        release_year: 2024,
        duration_seconds: 180,
        bitrate: 320000,
        sample_rate: 44100,
        codec: 'mp3',
        file_size_bytes: 5000000,
        date_added: Date.now(),
        is_compilation: false,
        artwork_path: '/artwork/album123.jpg'
      };

      const result = db.insertTrack(track);
      expect(result.track_id).toBeDefined();
      expect(result.track_id).toBeGreaterThan(0);

      const retrieved = db.getTrack(result.track_id);
      expect(retrieved.title).toBe('Test Track');
      expect(retrieved.artist).toBe('Test Artist');
      expect(retrieved.track_number).toBe(1);
      expect(retrieved.release_year).toBe(2024);
    });

    test('inserts track with minimal metadata', () => {
      const track = {
        file_path: '/music/minimal.mp3',
        title: 'Minimal Track',
        date_added: Date.now()
      };

      const result = db.insertTrack(track);
      const retrieved = db.getTrack(result.track_id);

      expect(retrieved.title).toBe('Minimal Track');
      expect(retrieved.artist).toBeNull();
      expect(retrieved.album).toBeNull();
    });

    test('rejects duplicate file paths', () => {
      const track = {
        file_path: '/music/duplicate.mp3',
        title: 'Track 1',
        date_added: Date.now()
      };

      db.insertTrack(track);

      expect(() => {
        db.insertTrack(track);
      }).toThrow();
    });

    test('gets all tracks', () => {
      db.insertTrack({ file_path: '/1.mp3', title: 'Track 1', date_added: Date.now() });
      db.insertTrack({ file_path: '/2.mp3', title: 'Track 2', date_added: Date.now() });
      db.insertTrack({ file_path: '/3.mp3', title: 'Track 3', date_added: Date.now() });

      const tracks = db.getTracks();
      expect(tracks).toHaveLength(3);
    });

    test('filters tracks by artist', () => {
      db.insertTrack({ file_path: '/1.mp3', title: 'T1', artist: 'Artist A', date_added: Date.now() });
      db.insertTrack({ file_path: '/2.mp3', title: 'T2', artist: 'Artist B', date_added: Date.now() });
      db.insertTrack({ file_path: '/3.mp3', title: 'T3', artist: 'Artist A', date_added: Date.now() });

      const tracks = db.getTracks({ artist: 'Artist A' });
      expect(tracks).toHaveLength(2);
    });

    test('filters tracks by album', () => {
      db.insertTrack({ file_path: '/1.mp3', title: 'T1', album: 'Album 1', date_added: Date.now() });
      db.insertTrack({ file_path: '/2.mp3', title: 'T2', album: 'Album 2', date_added: Date.now() });

      const tracks = db.getTracks({ album: 'Album 1' });
      expect(tracks).toHaveLength(1);
      expect(tracks[0].title).toBe('T1');
    });

    test('sorts tracks', () => {
      db.insertTrack({ file_path: '/c.mp3', title: 'C Track', date_added: Date.now() });
      db.insertTrack({ file_path: '/a.mp3', title: 'A Track', date_added: Date.now() });
      db.insertTrack({ file_path: '/b.mp3', title: 'B Track', date_added: Date.now() });

      const tracks = db.getTracks({ sortBy: 'title', sortOrder: 'ASC' });
      expect(tracks[0].title).toBe('A Track');
      expect(tracks[1].title).toBe('B Track');
      expect(tracks[2].title).toBe('C Track');
    });

    test('updates track metadata', () => {
      const result = db.insertTrack({
        file_path: '/track.mp3',
        title: 'Original Title',
        artist: 'Original Artist',
        date_added: Date.now()
      });

      db.updateTrack(result.track_id, {
        title: 'Updated Title',
        artist: 'Updated Artist'
      });

      const updated = db.getTrack(result.track_id);
      expect(updated.title).toBe('Updated Title');
      expect(updated.artist).toBe('Updated Artist');
    });

    test('updates track updated_at timestamp', async () => {
      const result = db.insertTrack({
        file_path: '/track.mp3',
        title: 'Test',
        date_added: Date.now()
      });

      const original = db.getTrack(result.track_id);

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1000));

      db.updateTrack(result.track_id, { title: 'Updated' });

      const updated = db.getTrack(result.track_id);
      expect(updated.updated_at).toBeGreaterThan(original.updated_at);
    });

    test('deletes track', () => {
      const result = db.insertTrack({
        file_path: '/track.mp3',
        title: 'To Delete',
        date_added: Date.now()
      });

      const deleteResult = db.deleteTrack(result.track_id);
      expect(deleteResult.changes).toBe(1);

      const retrieved = db.getTrack(result.track_id);
      expect(retrieved).toBeUndefined();
    });

    test('returns undefined for non-existent track', () => {
      const track = db.getTrack(999);
      expect(track).toBeUndefined();
    });
  });

  describe('Genre Operations', () => {
    test('creates genre', () => {
      const genreId = db.getOrCreateGenre('Rock');
      expect(genreId).toBeDefined();
      expect(genreId).toBeGreaterThan(0);
    });

    test('returns existing genre if already exists', () => {
      const id1 = db.getOrCreateGenre('Jazz');
      const id2 = db.getOrCreateGenre('Jazz');
      expect(id1).toBe(id2);
    });

    test('adds multiple genres to track', () => {
      const result = db.insertTrack({
        file_path: '/track.mp3',
        title: 'Test Track',
        date_added: Date.now()
      });

      db.addTrackGenres(result.track_id, ['Rock', 'Alternative', 'Indie']);

      const genres = db.getTrackGenres(result.track_id);
      expect(genres).toHaveLength(3);
      expect(genres).toContain('Rock');
      expect(genres).toContain('Alternative');
      expect(genres).toContain('Indie');
    });

    test('returns genres in alphabetical order', () => {
      const result = db.insertTrack({
        file_path: '/track.mp3',
        title: 'Test',
        date_added: Date.now()
      });

      db.addTrackGenres(result.track_id, ['Rock', 'Alternative', 'Blues']);

      const genres = db.getTrackGenres(result.track_id);
      expect(genres[0]).toBe('Alternative');
      expect(genres[1]).toBe('Blues');
      expect(genres[2]).toBe('Rock');
    });

    test('clears track genres', () => {
      const result = db.insertTrack({
        file_path: '/track.mp3',
        title: 'Test',
        date_added: Date.now()
      });

      db.addTrackGenres(result.track_id, ['Rock', 'Pop']);
      db.clearTrackGenres(result.track_id);

      const genres = db.getTrackGenres(result.track_id);
      expect(genres).toHaveLength(0);
    });

    test('gets all genres', () => {
      db.getOrCreateGenre('Rock');
      db.getOrCreateGenre('Jazz');
      db.getOrCreateGenre('Classical');

      const genres = db.getAllGenres();
      expect(genres.length).toBeGreaterThanOrEqual(3);
      expect(genres[0].name).toBe('Classical'); // Alphabetical order
    });

    test('cascades delete when track is deleted', () => {
      const result = db.insertTrack({
        file_path: '/track.mp3',
        title: 'Test',
        date_added: Date.now()
      });

      db.addTrackGenres(result.track_id, ['Rock']);
      db.deleteTrack(result.track_id);

      // Check that track_genres entry was deleted
      const stmt = db.db.prepare('SELECT COUNT(*) as count FROM track_genres WHERE track_id = ?');
      const count = stmt.get(result.track_id).count;
      expect(count).toBe(0);
    });
  });

  describe('Playlist Operations', () => {
    test('creates playlist', () => {
      const result = db.createPlaylist({
        name: 'My Playlist',
        description: 'Test playlist'
      });

      expect(result.playlist_id).toBeDefined();

      const playlist = db.getPlaylist(result.playlist_id);
      expect(playlist.name).toBe('My Playlist');
      expect(playlist.description).toBe('Test playlist');
    });

    test('creates playlist without optional fields', () => {
      const result = db.createPlaylist({ name: 'Simple Playlist' });
      const playlist = db.getPlaylist(result.playlist_id);

      expect(playlist.name).toBe('Simple Playlist');
      expect(playlist.description).toBeNull();
      expect(playlist.artwork_path).toBeNull();
    });

    test('gets all playlists', () => {
      db.createPlaylist({ name: 'Playlist 1' });
      db.createPlaylist({ name: 'Playlist 2' });

      const playlists = db.getAllPlaylists();
      expect(playlists).toHaveLength(2);
    });

    test('updates playlist', () => {
      const result = db.createPlaylist({ name: 'Original Name' });

      db.updatePlaylist(result.playlist_id, {
        name: 'Updated Name',
        description: 'New description'
      });

      const updated = db.getPlaylist(result.playlist_id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('New description');
    });

    test('deletes playlist', () => {
      const result = db.createPlaylist({ name: 'To Delete' });

      db.deletePlaylist(result.playlist_id);

      const playlist = db.getPlaylist(result.playlist_id);
      expect(playlist).toBeUndefined();
    });

    test('adds tracks to playlist', () => {
      const playlist = db.createPlaylist({ name: 'Test Playlist' });

      const track1 = db.insertTrack({ file_path: '/1.mp3', title: 'T1', date_added: Date.now() });
      const track2 = db.insertTrack({ file_path: '/2.mp3', title: 'T2', date_added: Date.now() });

      db.addTracksToPlaylist(playlist.playlist_id, [track1.track_id, track2.track_id]);

      const tracks = db.getPlaylistTracks(playlist.playlist_id);
      expect(tracks).toHaveLength(2);
      expect(tracks[0].position).toBe(1);
      expect(tracks[1].position).toBe(2);
    });

    test('maintains track order in playlist', () => {
      const playlist = db.createPlaylist({ name: 'Test' });

      const track1 = db.insertTrack({ file_path: '/1.mp3', title: 'First', date_added: Date.now() });
      const track2 = db.insertTrack({ file_path: '/2.mp3', title: 'Second', date_added: Date.now() });
      const track3 = db.insertTrack({ file_path: '/3.mp3', title: 'Third', date_added: Date.now() });

      db.addTracksToPlaylist(playlist.playlist_id, [track1.track_id, track2.track_id, track3.track_id]);

      const tracks = db.getPlaylistTracks(playlist.playlist_id);
      expect(tracks[0].title).toBe('First');
      expect(tracks[1].title).toBe('Second');
      expect(tracks[2].title).toBe('Third');
    });

    test('removes track from playlist', () => {
      const playlist = db.createPlaylist({ name: 'Test' });
      const track = db.insertTrack({ file_path: '/1.mp3', title: 'T1', date_added: Date.now() });

      db.addTracksToPlaylist(playlist.playlist_id, [track.track_id]);
      db.removeTrackFromPlaylist(playlist.playlist_id, track.track_id);

      const tracks = db.getPlaylistTracks(playlist.playlist_id);
      expect(tracks).toHaveLength(0);
    });

    test('cascades delete when playlist is deleted', () => {
      const playlist = db.createPlaylist({ name: 'Test' });
      const track = db.insertTrack({ file_path: '/1.mp3', title: 'T1', date_added: Date.now() });

      db.addTracksToPlaylist(playlist.playlist_id, [track.track_id]);
      db.deletePlaylist(playlist.playlist_id);

      // Check that playlist_tracks entries were deleted
      const stmt = db.db.prepare('SELECT COUNT(*) as count FROM playlist_tracks WHERE playlist_id = ?');
      const count = stmt.get(playlist.playlist_id).count;
      expect(count).toBe(0);
    });
  });

  describe('Album Operations', () => {
    test('creates album', () => {
      const albumId = db.getOrCreateAlbum({
        album_title: 'Test Album',
        album_artist: 'Test Artist',
        release_year: 2024,
        is_compilation: false
      });

      expect(albumId).toBeDefined();
      expect(albumId).toBeGreaterThan(0);
    });

    test('returns existing album if already exists', () => {
      const id1 = db.getOrCreateAlbum({
        album_title: 'Same Album',
        album_artist: 'Same Artist'
      });

      const id2 = db.getOrCreateAlbum({
        album_title: 'Same Album',
        album_artist: 'Same Artist'
      });

      expect(id1).toBe(id2);
    });

    test('treats albums with same title but different artists as different', () => {
      const id1 = db.getOrCreateAlbum({
        album_title: 'Greatest Hits',
        album_artist: 'Artist A'
      });

      const id2 = db.getOrCreateAlbum({
        album_title: 'Greatest Hits',
        album_artist: 'Artist B'
      });

      expect(id1).not.toBe(id2);
    });

    test('gets all albums', () => {
      db.getOrCreateAlbum({ album_title: 'Album 1', album_artist: 'Artist A' });
      db.getOrCreateAlbum({ album_title: 'Album 2', album_artist: 'Artist B' });

      const albums = db.getAllAlbums();
      expect(albums.length).toBeGreaterThanOrEqual(2);
    });

    test('handles compilation albums', () => {
      const albumId = db.getOrCreateAlbum({
        album_title: 'Various Artists Collection',
        album_artist: 'Various Artists',
        is_compilation: true
      });

      const albums = db.getAllAlbums();
      const compilation = albums.find(a => a.album_id === albumId);
      expect(compilation.is_compilation).toBe(1);
    });
  });

  describe('Statistics', () => {
    test('returns accurate statistics', () => {
      // Add some data
      db.insertTrack({ file_path: '/1.mp3', title: 'T1', date_added: Date.now() });
      db.insertTrack({ file_path: '/2.mp3', title: 'T2', date_added: Date.now() });

      db.createPlaylist({ name: 'P1' });

      db.getOrCreateGenre('Rock');
      db.getOrCreateGenre('Jazz');

      db.getOrCreateAlbum({ album_title: 'Album 1', album_artist: 'Artist' });

      const stats = db.getStats();
      expect(stats.tracks).toBe(2);
      expect(stats.playlists).toBe(1);
      expect(stats.genres).toBe(2);
      expect(stats.albums).toBe(1);
    });
  });

  describe('Migrations', () => {
    test('runs migration and updates version', () => {
      let migrationRan = false;

      db.migrate(2, (database) => {
        migrationRan = true;
        database.exec('CREATE TABLE test_migration (id INTEGER)');
      });

      expect(migrationRan).toBe(true);
      expect(db.getSchemaVersion()).toBe(2);

      // Verify table was created
      const tables = db.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='test_migration'
      `).all();

      expect(tables).toHaveLength(1);
    });

    test('does not run migration if already at version', () => {
      let migrationCount = 0;

      db.migrate(1, () => {
        migrationCount++;
      });

      expect(migrationCount).toBe(0);
      expect(db.getSchemaVersion()).toBe(1);
    });

    test('runs multiple migrations in sequence', () => {
      db.migrate(2, (database) => {
        database.exec('CREATE TABLE migration_2 (id INTEGER)');
      });

      db.migrate(3, (database) => {
        database.exec('CREATE TABLE migration_3 (id INTEGER)');
      });

      expect(db.getSchemaVersion()).toBe(3);
    });
  });

  describe('Transactions', () => {
    test('rollback on error in genre assignment', () => {
      const result = db.insertTrack({
        file_path: '/track.mp3',
        title: 'Test',
        date_added: Date.now()
      });

      try {
        db.db.transaction(() => {
          db.addTrackGenres(result.track_id, ['Rock']);
          throw new Error('Simulated error');
        })();
      } catch (e) {
        // Expected error
      }

      // Transaction should have rolled back
      const genres = db.getTrackGenres(result.track_id);
      expect(genres).toHaveLength(0);
    });
  });

  describe('Complex Queries', () => {
    test('handles tracks with multiple genres', () => {
      const track1 = db.insertTrack({ file_path: '/1.mp3', title: 'Rock Song', date_added: Date.now() });
      const track2 = db.insertTrack({ file_path: '/2.mp3', title: 'Jazz Song', date_added: Date.now() });

      db.addTrackGenres(track1.track_id, ['Rock', 'Alternative']);
      db.addTrackGenres(track2.track_id, ['Jazz', 'Blues']);

      const track1Genres = db.getTrackGenres(track1.track_id);
      expect(track1Genres).toEqual(['Alternative', 'Rock']);

      const track2Genres = db.getTrackGenres(track2.track_id);
      expect(track2Genres).toEqual(['Blues', 'Jazz']);
    });

    test('handles compilation albums correctly', () => {
      // Insert compilation tracks
      db.insertTrack({
        file_path: '/comp1.mp3',
        title: 'Track 1',
        artist: 'Artist A',
        album: 'Best of 2024',
        album_artist: 'Various Artists',
        is_compilation: true,
        date_added: Date.now()
      });

      db.insertTrack({
        file_path: '/comp2.mp3',
        title: 'Track 2',
        artist: 'Artist B',
        album: 'Best of 2024',
        album_artist: 'Various Artists',
        is_compilation: true,
        date_added: Date.now()
      });

      const tracks = db.getTracks({ album: 'Best of 2024' });
      expect(tracks).toHaveLength(2);
      expect(tracks[0].is_compilation).toBe(1);
      expect(tracks[1].is_compilation).toBe(1);
    });
  });
});
