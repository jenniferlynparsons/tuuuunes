# Phase 3: Views Implementation - Implementation Tickets

## Overview
Phase 3 builds out the three main views: Library (sortable list), Album Gallery (grid with blurred backgrounds), and Playlist management. This is where the iTunes 11 architecture really shines. Estimated 1-2 weeks of development time.

---

## TICKET 3.1: Library View - Sortable Track List
**Priority:** P0 (Blocking)  
**Estimate:** 8 hours

### Description
Implement the main library view showing all tracks in a sortable table with columns for track #, title, artist, album, duration, etc.

### View Features
- Sortable columns (click header to sort)
- Multi-select tracks (Cmd/Ctrl+click, Shift+click)
- Right-click context menu
- Search/filter integration
- Virtual scrolling for large libraries (10,000+ tracks)

### Table Columns
1. Track # (sortable)
2. Title (sortable)
3. Artist (sortable)
4. Album (sortable)
5. Album Artist (sortable, hidden by default)
6. Genre (sortable)
7. Year (sortable)
8. Duration (sortable)
9. Date Added (sortable)

### Component Structure
```jsx
function LibraryView() {
  const [tracks, setTracks] = useState([]);
  const [sortColumn, setSortColumn] = useState('title');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedTracks, setSelectedTracks] = useState(new Set());
  
  useEffect(() => {
    loadTracks();
  }, [sortColumn, sortDirection]);
  
  const loadTracks = async () => {
    const data = await window.api.getTracks({
      sortBy: sortColumn,
      sortDirection: sortDirection
    });
    setTracks(data);
  };
  
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const handleTrackClick = (track, event) => {
    if (event.metaKey || event.ctrlKey) {
      // Multi-select: add/remove from selection
      const newSelection = new Set(selectedTracks);
      if (newSelection.has(track.track_id)) {
        newSelection.delete(track.track_id);
      } else {
        newSelection.add(track.track_id);
      }
      setSelectedTracks(newSelection);
    } else if (event.shiftKey) {
      // Range select
      // Implementation for shift-select range
    } else {
      // Single select
      setSelectedTracks(new Set([track.track_id]));
    }
  };
  
  const handleTrackDoubleClick = async (track) => {
    await window.api.setQueue(tracks);
    await window.api.playTrackAt(tracks.findIndex(t => t.track_id === track.track_id));
  };
  
  return (
    <div className="library-view">
      <VirtualizedTable
        data={tracks}
        columns={columns}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        selectedRows={selectedTracks}
        onRowClick={handleTrackClick}
        onRowDoubleClick={handleTrackDoubleClick}
        rowHeight={32}
      />
    </div>
  );
}
```

### Virtual Scrolling
For large libraries, use `react-window` or `react-virtual`:
```jsx
import { FixedSizeList } from 'react-window';

function VirtualizedTable({ data, rowHeight }) {
  const Row = ({ index, style }) => {
    const track = data[index];
    return (
      <div style={style} className="track-row">
        <span className="track-number">{track.track_number}</span>
        <span className="title">{track.title}</span>
        <span className="artist">{track.artist}</span>
        <span className="album">{track.album}</span>
        <span className="duration">{formatDuration(track.duration_seconds)}</span>
      </div>
    );
  };
  
  return (
    <FixedSizeList
      height={window.innerHeight - 160} // Account for player bar + header
      itemCount={data.length}
      itemSize={rowHeight}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Context Menu
```javascript
const contextMenuItems = [
  { label: 'Play', action: playTrack },
  { label: 'Add to Queue', action: addToQueue },
  { type: 'separator' },
  { label: 'Add to Playlist...', action: showPlaylistPicker },
  { type: 'separator' },
  { label: 'Get Info', action: showTrackInfo },
  { label: 'Delete from Library', action: deleteTrack }
];
```

### Acceptance Criteria
- [ ] Displays all tracks from database
- [ ] Sorting works on all columns
- [ ] Sort indicator shows (▲ or ▼)
- [ ] Multi-select works (Cmd+click, Shift+click)
- [ ] Selection persists during scroll
- [ ] Double-click plays track
- [ ] Right-click shows context menu
- [ ] Smooth scrolling with 10,000+ tracks
- [ ] Currently playing track highlighted

### Performance
- Virtual scrolling for smooth performance
- Lazy load additional data as needed
- Debounce sort operations
- Cache rendered rows

### Definition of Done
- Table renders with all columns
- Sorting functional on all columns
- Selection works correctly
- Virtual scrolling performs well
- Context menu functional

---

## TICKET 3.2: Album Gallery View
**Priority:** P0 (Blocking)  
**Estimate:** 10 hours

### Description
Implement album grid view with artwork, album info, and the signature blurred background detail view.

### Grid Layout
- Album artwork cards in responsive grid
- Album title and artist below artwork
- Track count indicator
- Year indicator
- Click album to show detail view with blurred background

### Album Card Component
```jsx
function AlbumCard({ album, onClick }) {
  return (
    <div className="album-card" onClick={() => onClick(album)}>
      <div className="album-artwork">
        {album.artwork_path ? (
          <img src={`file://${album.artwork_path}`} alt={album.album_title} />
        ) : (
          <div className="no-artwork">♪</div>
        )}
      </div>
      <div className="album-info">
        <div className="album-title">{album.album_title}</div>
        <div className="album-artist">{album.album_artist}</div>
        <div className="album-meta">
          {album.release_year} · {album.track_count} tracks
        </div>
      </div>
    </div>
  );
}
```

### Album Gallery Component
```jsx
function AlbumGalleryView() {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumTracks, setAlbumTracks] = useState([]);
  
  useEffect(() => {
    loadAlbums();
  }, []);
  
  const loadAlbums = async () => {
    const data = await window.api.getAlbums({
      sortBy: 'album_artist',
      includeCompilations: true
    });
    setAlbums(data);
  };
  
  const handleAlbumClick = async (album) => {
    setSelectedAlbum(album);
    const tracks = await window.api.getAlbumTracks(album.album_id);
    setAlbumTracks(tracks);
  };
  
  const handleCloseDetail = () => {
    setSelectedAlbum(null);
    setAlbumTracks([]);
  };
  
  return (
    <div className="album-gallery-view">
      {!selectedAlbum ? (
        <div className="album-grid">
          {albums.map(album => (
            <AlbumCard 
              key={album.album_id}
              album={album}
              onClick={handleAlbumClick}
            />
          ))}
        </div>
      ) : (
        <AlbumDetailView 
          album={selectedAlbum}
          tracks={albumTracks}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
```

### Album Detail View (Blurred Background)
```jsx
function AlbumDetailView({ album, tracks, onClose }) {
  const handlePlayAlbum = async () => {
    await window.api.setQueue(tracks);
    await window.api.playTrackAt(0);
  };
  
  return (
    <div className="album-detail-view">
      {/* Blurred background */}
      <div 
        className="album-background"
        style={{
          backgroundImage: `url(file://${album.artwork_path})`,
          filter: 'blur(40px) brightness(0.4) saturate(0.5)'
        }}
      />
      
      {/* Content overlay */}
      <div className="album-detail-content">
        <button className="close-button" onClick={onClose}>✕</button>
        
        <div className="album-header">
          <img 
            src={`file://${album.artwork_path}`}
            className="album-artwork-large"
            alt={album.album_title}
          />
          <div className="album-info">
            <h1>{album.album_title}</h1>
            <h2>{album.album_artist}</h2>
            <div className="album-meta">
              {album.release_year} · {tracks.length} tracks · 
              {formatTotalDuration(tracks)}
            </div>
            <button className="play-album-button" onClick={handlePlayAlbum}>
              ▶ Play Album
            </button>
          </div>
        </div>
        
        <div className="album-tracks">
          <table>
            <tbody>
              {tracks.map((track, index) => (
                <tr 
                  key={track.track_id}
                  onDoubleClick={() => playTrackFromAlbum(tracks, index)}
                >
                  <td className="track-number">{track.track_number}</td>
                  <td className="track-title">{track.title}</td>
                  <td className="track-artist">{track.artist}</td>
                  <td className="track-duration">
                    {formatDuration(track.duration_seconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

### CSS for Blurred Background
```css
.album-detail-view {
  position: fixed;
  top: 80px; /* Below player bar */
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
}

.album-background {
  position: fixed;
  top: 80px;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  z-index: -1;
}

.album-detail-content {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
  color: #ffffff;
}

.album-artwork-large {
  width: 300px;
  height: 300px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
```

### Acceptance Criteria
- [ ] Album grid displays all albums
- [ ] Artwork loads and displays
- [ ] Missing artwork handled (placeholder)
- [ ] Click album opens detail view
- [ ] Blurred background effect works
- [ ] Track list shows in detail view
- [ ] Play album button works
- [ ] Double-click track plays from album queue
- [ ] Close button returns to grid
- [ ] Smooth transitions between views

### Performance
- Lazy load album artwork (load as scrolled into view)
- Image caching for artwork
- Virtualized grid for 1000+ albums
- Optimize blur effect (use CSS backdrop-filter if supported)

### Definition of Done
- Album grid functional and performant
- Detail view with blurred background working
- Play from album context works
- Transitions smooth
- Artwork displays correctly

---

## TICKET 3.3: Playlist View & Management
**Priority:** P1 (Core feature)  
**Estimate:** 10 hours

### Description
Implement playlist creation, editing, track management, and custom artwork support.

### Playlist Features
- Create new playlist
- Rename playlist
- Delete playlist
- Add tracks to playlist
- Remove tracks from playlist
- Reorder tracks (drag and drop)
- Custom playlist artwork
- Play playlist

### Playlist Sidebar
```jsx
function PlaylistsSidebar({ playlists, selectedPlaylist, onSelect, onCreate }) {
  return (
    <div className="playlists-section">
      <div className="section-header">
        <h3>PLAYLISTS</h3>
        <button onClick={onCreate} title="New Playlist">+</button>
      </div>
      <ul className="playlist-list">
        {playlists.map(playlist => (
          <li 
            key={playlist.playlist_id}
            className={selectedPlaylist?.playlist_id === playlist.playlist_id ? 'selected' : ''}
            onClick={() => onSelect(playlist)}
          >
            <img 
              src={playlist.artwork_path || 'default-playlist.png'} 
              className="playlist-icon"
            />
            <span>{playlist.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Playlist View Component
```jsx
function PlaylistView({ playlist }) {
  const [tracks, setTracks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    if (playlist) {
      loadPlaylistTracks();
    }
  }, [playlist]);
  
  const loadPlaylistTracks = async () => {
    const data = await window.api.getPlaylistTracks(playlist.playlist_id);
    setTracks(data);
  };
  
  const handleRemoveTrack = async (trackId) => {
    await window.api.removeFromPlaylist(playlist.playlist_id, trackId);
    loadPlaylistTracks();
  };
  
  const handleReorderTracks = async (newOrder) => {
    await window.api.reorderPlaylist(playlist.playlist_id, newOrder);
    setTracks(newOrder);
  };
  
  const handlePlayPlaylist = async () => {
    await window.api.setQueue(tracks);
    await window.api.playTrackAt(0);
  };
  
  const handleEditArtwork = async () => {
    const artworkPath = await window.api.selectArtworkFile();
    if (artworkPath) {
      await window.api.updatePlaylistArtwork(playlist.playlist_id, artworkPath);
    }
  };
  
  return (
    <div className="playlist-view">
      <div className="playlist-header">
        <div 
          className="playlist-artwork"
          onClick={handleEditArtwork}
          title="Click to change artwork"
        >
          {playlist.artwork_path ? (
            <img src={`file://${playlist.artwork_path}`} alt={playlist.name} />
          ) : (
            <div className="no-artwork">♪</div>
          )}
        </div>
        
        <div className="playlist-info">
          <h1>{playlist.name}</h1>
          <div className="playlist-meta">
            {tracks.length} tracks · {formatTotalDuration(tracks)}
          </div>
          <button onClick={handlePlayPlaylist} className="play-button">
            ▶ Play
          </button>
        </div>
      </div>
      
      <DraggableTrackList
        tracks={tracks}
        onRemove={handleRemoveTrack}
        onReorder={handleReorderTracks}
      />
    </div>
  );
}
```

### Drag-and-Drop Track Reordering
```jsx
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

function DraggableTrackList({ tracks, onRemove, onReorder }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(tracks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onReorder(items);
  };
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="playlist-tracks">
        {(provided) => (
          <table {...provided.droppableProps} ref={provided.innerRef}>
            <tbody>
              {tracks.map((track, index) => (
                <Draggable 
                  key={track.track_id} 
                  draggableId={String(track.track_id)} 
                  index={index}
                >
                  {(provided) => (
                    <tr
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <td className="drag-handle">⋮⋮</td>
                      <td>{track.title}</td>
                      <td>{track.artist}</td>
                      <td>{formatDuration(track.duration_seconds)}</td>
                      <td>
                        <button onClick={() => onRemove(track.track_id)}>✕</button>
                      </td>
                    </tr>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </tbody>
          </table>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

### Create Playlist Dialog
```jsx
function CreatePlaylistDialog({ onClose, onCreate }) {
  const [name, setName] = useState('');
  
  const handleCreate = async () => {
    if (name.trim()) {
      await window.api.createPlaylist({ name: name.trim() });
      onCreate();
      onClose();
    }
  };
  
  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2>New Playlist</h2>
        <input
          type="text"
          placeholder="Playlist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
          autoFocus
        />
        <div className="dialog-buttons">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleCreate} disabled={!name.trim()}>Create</button>
        </div>
      </div>
    </div>
  );
}
```

### Add to Playlist
```jsx
function AddToPlaylistMenu({ trackIds, playlists, onClose }) {
  const handleAddTo = async (playlistId) => {
    await window.api.addTracksToPlaylist(playlistId, trackIds);
    onClose();
  };
  
  return (
    <div className="context-menu">
      <div className="menu-header">Add to Playlist</div>
      {playlists.map(playlist => (
        <div 
          key={playlist.playlist_id}
          className="menu-item"
          onClick={() => handleAddTo(playlist.playlist_id)}
        >
          {playlist.name}
        </div>
      ))}
      <div className="menu-separator" />
      <div className="menu-item" onClick={() => createNewPlaylistWith(trackIds)}>
        New Playlist...
      </div>
    </div>
  );
}
```

### Acceptance Criteria
- [ ] Create new playlist
- [ ] Rename playlist
- [ ] Delete playlist (with confirmation)
- [ ] Add tracks to playlist (from library, album)
- [ ] Remove tracks from playlist
- [ ] Reorder tracks via drag-and-drop
- [ ] Custom playlist artwork
- [ ] Play playlist
- [ ] Playlist count updates
- [ ] Empty playlist state handled

### Database Operations
```sql
-- Add tracks to playlist
INSERT INTO playlist_tracks (playlist_id, track_id, position)
SELECT ?, track_id, (SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_tracks WHERE playlist_id = ?)
FROM tracks WHERE track_id IN (?);

-- Reorder playlist
UPDATE playlist_tracks 
SET position = ? 
WHERE playlist_id = ? AND track_id = ?;

-- Remove from playlist
DELETE FROM playlist_tracks 
WHERE playlist_id = ? AND track_id = ?;
```

### Definition of Done
- Playlist CRUD operations work
- Drag-and-drop reordering functional
- Custom artwork support
- Add to playlist from all views
- Smooth UX for all operations

---

## TICKET 3.4: View Switching & Navigation
**Priority:** P1 (Core feature)  
**Estimate:** 4 hours

### Description
Implement smooth navigation between Library, Album, and Playlist views with state preservation.

### View State Management
```jsx
const ViewTypes = {
  LIBRARY: 'library',
  ALBUMS: 'albums',
  PLAYLIST: 'playlist'
};

function MainContent() {
  const [currentView, setCurrentView] = useState(ViewTypes.LIBRARY);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  
  // Preserve scroll position when switching views
  const viewStates = useRef({
    library: { scrollTop: 0 },
    albums: { scrollTop: 0 }
  });
  
  const handleViewChange = (newView) => {
    // Save current scroll position
    saveScrollPosition(currentView);
    
    // Change view
    setCurrentView(newView);
    
    // Restore scroll position
    requestAnimationFrame(() => {
      restoreScrollPosition(newView);
    });
  };
  
  return (
    <div className="main-content">
      {currentView === ViewTypes.LIBRARY && <LibraryView />}
      {currentView === ViewTypes.ALBUMS && <AlbumGalleryView />}
      {currentView === ViewTypes.PLAYLIST && selectedPlaylist && (
        <PlaylistView playlist={selectedPlaylist} />
      )}
    </div>
  );
}
```

### Sidebar Navigation
```jsx
function Sidebar({ onViewChange, onPlaylistSelect }) {
  return (
    <div className="sidebar">
      <div className="library-section">
        <h3>LIBRARY</h3>
        <ul>
          <li onClick={() => onViewChange(ViewTypes.LIBRARY)}>
            <Icon name="music" /> Music
          </li>
          <li onClick={() => onViewChange(ViewTypes.ALBUMS)}>
            <Icon name="album" /> Albums
          </li>
        </ul>
      </div>
      
      <PlaylistsSidebar 
        onPlaylistSelect={(playlist) => {
          onViewChange(ViewTypes.PLAYLIST);
          onPlaylistSelect(playlist);
        }}
      />
    </div>
  );
}
```

### Acceptance Criteria
- [ ] Click Library shows library view
- [ ] Click Albums shows album gallery
- [ ] Click playlist shows playlist view
- [ ] Active view highlighted in sidebar
- [ ] Scroll position preserved when switching
- [ ] View transitions smooth
- [ ] Keyboard shortcuts work (Cmd+1, Cmd+2, etc.)

### Definition of Done
- All views accessible from sidebar
- Navigation smooth and instant
- State preserved appropriately
- Visual feedback on active view

---

## TICKET 3.5: Search & Filter
**Priority:** P2 (Nice to have)  
**Estimate:** 6 hours

### Description
Global search across tracks with real-time filtering.

### Search Features
- Search by: title, artist, album, genre
- Fuzzy matching (handle typos)
- Real-time results as user types
- Clear search button
- Search shortcut: Cmd/Ctrl+F

### Implementation
```jsx
function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedSearch = useMemo(
    () => debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      const searchResults = await window.api.searchTracks(searchQuery);
      setResults(searchResults);
      setIsSearching(false);
    }, 300),
    []
  );
  
  useEffect(() => {
    debouncedSearch(query);
  }, [query]);
  
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search library..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <button onClick={() => setQuery('')}>✕</button>
      )}
    </div>
  );
}
```

### Search Implementation (SQLite FTS)
```sql
-- Create FTS virtual table for fast search
CREATE VIRTUAL TABLE tracks_fts USING fts5(
  title, artist, album, album_artist, 
  content=tracks,
  content_rowid=track_id
);

-- Keep FTS table in sync with tracks
CREATE TRIGGER tracks_ai AFTER INSERT ON tracks BEGIN
  INSERT INTO tracks_fts(rowid, title, artist, album, album_artist)
  VALUES (new.track_id, new.title, new.artist, new.album, new.album_artist);
END;

-- Search query
SELECT t.* FROM tracks t
JOIN tracks_fts fts ON t.track_id = fts.rowid
WHERE tracks_fts MATCH ?
ORDER BY rank
LIMIT 50;
```

### Acceptance Criteria
- [ ] Search box in header
- [ ] Results update as user types
- [ ] Fuzzy matching works
- [ ] Clear button clears search
- [ ] Search results clickable
- [ ] Fast (< 100ms for 10k track library)

### Definition of Done
- Search functional across all fields
- Performance acceptable
- Keyboard shortcut works

---

## Phase 3 Summary

### Total Estimated Time: 38 hours (~1-2 weeks)

### Critical Path
1. Library View (3.1)
2. Album Gallery View (3.2)
3. Playlist Management (3.3)
4. View Switching (3.4)

### Deliverables
✅ Sortable library view with virtual scrolling  
✅ Album gallery with blurred background detail  
✅ Playlist creation and management  
✅ Drag-and-drop track reordering  
✅ Custom playlist artwork  
✅ View navigation and state preservation  
✅ Search functionality (optional)  

### What's NOT in Phase 3
- Smart playlists (V2)
- Advanced search filters (V2)
- Playlist folders (V2)
- Collaborative playlists (V2)

---

## Testing Checklist

### Library View Testing
- [ ] Sort by each column
- [ ] Multi-select tracks
- [ ] Scroll smoothly with 1000+ tracks
- [ ] Double-click plays
- [ ] Context menu works

### Album Gallery Testing
- [ ] All albums display
- [ ] Click opens detail view
- [ ] Blurred background renders
- [ ] Play album works
- [ ] Close returns to grid

### Playlist Testing
- [ ] Create playlist
- [ ] Rename playlist
- [ ] Delete playlist
- [ ] Add tracks to playlist
- [ ] Remove from playlist
- [ ] Reorder tracks (drag-drop)
- [ ] Custom artwork
- [ ] Play playlist

### Navigation Testing
- [ ] Switch between views
- [ ] Scroll position preserved
- [ ] Sidebar highlights active view
- [ ] Keyboard shortcuts work
