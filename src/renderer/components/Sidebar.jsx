// Sidebar navigation component
// This is a stub implementation - full implementation in Ticket 1.7

import React from 'react';

const Sidebar = ({ playlists = [] }) => {
  return (
    <aside className="sidebar">
      <div className="library-section">
        <h3>LIBRARY</h3>
        <ul>
          <li>Music</li>
          <li>Playlists</li>
        </ul>
      </div>

      {playlists.length > 0 && (
        <div className="playlists-section">
          <h3>PLAYLISTS</h3>
          <ul>
            {playlists.map((playlist) => (
              <li key={playlist.id}>{playlist.name}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
