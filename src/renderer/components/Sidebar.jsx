// Sidebar navigation component
// iTunes 11 architecture: clear hierarchical navigation

import React from 'react';
import { useView, VIEW_TYPES } from '../contexts/ViewContext';
import './Sidebar.css';

const Sidebar = ({ playlists = [] }) => {
  const { currentView, selectedPlaylistId, navigateToLibrary, navigateToAlbums, navigateToPlaylist } = useView();

  return (
    <aside className="sidebar">
      <div className="sidebar__section">
        <h3 className="sidebar__section-title">LIBRARY</h3>
        <ul className="sidebar__list">
          <li
            className={`sidebar__item ${currentView === VIEW_TYPES.LIBRARY ? 'sidebar__item--active' : ''}`}
            onClick={navigateToLibrary}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateToLibrary()}
          >
            <svg className="sidebar__icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <span>Music</span>
          </li>
          <li
            className={`sidebar__item ${currentView === VIEW_TYPES.ALBUMS ? 'sidebar__item--active' : ''}`}
            onClick={navigateToAlbums}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateToAlbums()}
          >
            <svg className="sidebar__icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
            </svg>
            <span>Albums</span>
          </li>
        </ul>
      </div>

      <div className="sidebar__section">
        <h3 className="sidebar__section-title">PLAYLISTS</h3>
        {playlists.length > 0 ? (
          <ul className="sidebar__list">
            {playlists.map((playlist) => (
              <li
                key={playlist.id}
                className={`sidebar__item ${currentView === VIEW_TYPES.PLAYLIST && selectedPlaylistId === playlist.id ? 'sidebar__item--active' : ''}`}
                onClick={() => navigateToPlaylist(playlist.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigateToPlaylist(playlist.id)}
              >
                <svg className="sidebar__icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                </svg>
                <span>{playlist.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sidebar__empty">No playlists yet</p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
