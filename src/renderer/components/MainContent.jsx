// MainContent - switches between different view types
// Placeholder views for now - full implementations in Phase 3

import React from 'react';
import { useView, VIEW_TYPES } from '../contexts/ViewContext';
import './MainContent.css';

// Placeholder view components - will be replaced with real implementations
function LibraryView() {
  return (
    <div className="view view--library">
      <div className="view__header">
        <h1 className="view__title">Music</h1>
      </div>
      <div className="view__placeholder">
        <svg className="view__placeholder-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
        <p>Your music library will appear here</p>
        <p className="view__placeholder-hint">Import music to get started</p>
      </div>
    </div>
  );
}

function AlbumsView() {
  return (
    <div className="view view--albums">
      <div className="view__header">
        <h1 className="view__title">Albums</h1>
      </div>
      <div className="view__placeholder">
        <svg className="view__placeholder-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
        </svg>
        <p>Album gallery will appear here</p>
        <p className="view__placeholder-hint">Browse your music by album artwork</p>
      </div>
    </div>
  );
}

function PlaylistView({ playlistId }) {
  return (
    <div className="view view--playlist">
      <div className="view__header">
        <h1 className="view__title">Playlist</h1>
      </div>
      <div className="view__placeholder">
        <svg className="view__placeholder-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
        </svg>
        <p>Playlist {playlistId} will appear here</p>
        <p className="view__placeholder-hint">Add tracks to build your playlist</p>
      </div>
    </div>
  );
}

function MainContent() {
  const { currentView, selectedPlaylistId } = useView();

  const renderView = () => {
    switch (currentView) {
      case VIEW_TYPES.LIBRARY:
        return <LibraryView />;
      case VIEW_TYPES.ALBUMS:
        return <AlbumsView />;
      case VIEW_TYPES.PLAYLIST:
        return <PlaylistView playlistId={selectedPlaylistId} />;
      default:
        return <LibraryView />;
    }
  };

  return (
    <main className="main-content">
      {renderView()}
    </main>
  );
}

export default MainContent;
