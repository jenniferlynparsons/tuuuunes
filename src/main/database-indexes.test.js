// Test to verify database indexes are working correctly
const MusicDatabase = require('./database');

describe('Database Index Verification', () => {
  let db;

  beforeEach(() => {
    db = new MusicDatabase(':memory:');
    db.initialize();

    // Insert some sample data for index testing
    for (let i = 1; i <= 100; i++) {
      db.insertTrack({
        file_path: `/music/track${i}.mp3`,
        title: `Track ${i}`,
        artist: `Artist ${i % 10}`, // 10 different artists
        album: `Album ${i % 20}`, // 20 different albums
        album_artist: `Artist ${i % 10}`,
        date_added: Date.now() + i
      });
    }
  });

  afterEach(() => {
    db.close();
  });

  test('uses index for artist queries', () => {
    const plan = db.db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM tracks WHERE artist = 'Artist 1'
    `).all();

    // Check if index is mentioned in query plan
    const usesIndex = plan.some(row =>
      row.detail && row.detail.includes('idx_tracks_artist')
    );

    expect(usesIndex).toBe(true);
  });

  test('uses index for album queries', () => {
    const plan = db.db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM tracks WHERE album = 'Album 1'
    `).all();

    const usesIndex = plan.some(row =>
      row.detail && row.detail.includes('idx_tracks_album')
    );

    expect(usesIndex).toBe(true);
  });

  test('uses index for album_artist queries', () => {
    const plan = db.db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM tracks WHERE album_artist = 'Artist 1'
    `).all();

    const usesIndex = plan.some(row =>
      row.detail && row.detail.includes('idx_tracks_album_artist')
    );

    expect(usesIndex).toBe(true);
  });

  test('uses index for date_added sorting', () => {
    const plan = db.db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM tracks ORDER BY date_added DESC
    `).all();

    const usesIndex = plan.some(row =>
      row.detail && row.detail.includes('idx_tracks_date_added')
    );

    expect(usesIndex).toBe(true);
  });

  test('uses index for genre lookups', () => {
    // Add some genres
    db.getOrCreateGenre('Rock');
    db.getOrCreateGenre('Jazz');

    const plan = db.db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM genres WHERE name = 'Rock'
    `).all();

    // SQLite may use either our index or the UNIQUE constraint index
    const usesIndex = plan.some(row =>
      row.detail && (
        row.detail.includes('idx_genres_name') ||
        row.detail.includes('USING INDEX') || // Generic index usage
        row.detail.includes('SEARCH') // Index-based search
      )
    );

    expect(usesIndex).toBe(true);
  });

  test('uses index for track-genre joins', () => {
    const plan = db.db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT g.name
      FROM genres g
      JOIN track_genres tg ON g.genre_id = tg.genre_id
      WHERE tg.track_id = 1
    `).all();

    // Should use index for the join
    const usesIndex = plan.some(row =>
      row.detail && (
        row.detail.includes('idx_track_genres_track') ||
        row.detail.includes('PRIMARY')
      )
    );

    expect(usesIndex).toBe(true);
  });

  test('uses index for playlist-track joins', () => {
    const playlist = db.createPlaylist({ name: 'Test' });
    db.addTracksToPlaylist(playlist.playlist_id, [1, 2, 3]);

    const plan = db.db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT t.*, pt.position
      FROM tracks t
      JOIN playlist_tracks pt ON t.track_id = pt.track_id
      WHERE pt.playlist_id = ?
      ORDER BY pt.position
    `).all(playlist.playlist_id);

    // Should use index for the playlist query
    const usesIndex = plan.some(row =>
      row.detail && (
        row.detail.includes('idx_playlist_tracks_playlist') ||
        row.detail.includes('PRIMARY')
      )
    );

    expect(usesIndex).toBe(true);
  });

  test('all table indexes exist', () => {
    const indexes = db.db.prepare(`
      SELECT name, tbl_name FROM sqlite_master
      WHERE type='index' AND name LIKE 'idx_%'
      ORDER BY name
    `).all();

    const expectedIndexes = [
      'idx_albums_artist',
      'idx_albums_title',
      'idx_genres_name',
      'idx_playlist_tracks_playlist',
      'idx_track_genres_genre',
      'idx_track_genres_track',
      'idx_tracks_album',
      'idx_tracks_album_artist',
      'idx_tracks_artist',
      'idx_tracks_date_added'
    ];

    const actualIndexNames = indexes.map(idx => idx.name);

    expectedIndexes.forEach(expectedIdx => {
      expect(actualIndexNames).toContain(expectedIdx);
    });
  });

  test('primary keys are enforced', () => {
    // Test track primary key
    const track1 = db.insertTrack({
      file_path: '/pk_test.mp3',
      title: 'Test',
      date_added: Date.now()
    });

    const track2 = db.getTrack(track1.track_id);
    expect(track2.track_id).toBe(track1.track_id);

    // Test that we can't manually set track_id to conflict
    expect(() => {
      db.db.prepare(`
        INSERT INTO tracks (track_id, file_path, title, date_added)
        VALUES (?, ?, ?, ?)
      `).run(track1.track_id, '/different.mp3', 'Different', Date.now());
    }).toThrow();
  });

  test('unique constraints are enforced', () => {
    // file_path should be unique
    expect(() => {
      db.insertTrack({
        file_path: '/music/track1.mp3', // Already inserted in beforeEach
        title: 'Duplicate',
        date_added: Date.now()
      });
    }).toThrow();

    // genre name should be unique
    const genreId1 = db.getOrCreateGenre('Unique Genre');
    const genreId2 = db.getOrCreateGenre('Unique Genre');
    expect(genreId1).toBe(genreId2); // Should return same ID, not create duplicate
  });

  test('foreign key constraints are enforced', () => {
    // Try to add track_genres entry for non-existent track
    expect(() => {
      db.db.prepare(`
        INSERT INTO track_genres (track_id, genre_id)
        VALUES (99999, 1)
      `).run();
    }).toThrow();

    // Try to add playlist_tracks entry for non-existent playlist
    expect(() => {
      db.db.prepare(`
        INSERT INTO playlist_tracks (playlist_id, track_id, position)
        VALUES (99999, 1, 1)
      `).run();
    }).toThrow();
  });
});
