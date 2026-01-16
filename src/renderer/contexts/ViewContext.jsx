// ViewContext - manages navigation state for the app
// Tracks which view is active and which playlist is selected

import React, { createContext, useContext, useState, useCallback } from 'react';

// View types available in the app
export const VIEW_TYPES = {
  LIBRARY: 'library',
  ALBUMS: 'albums',
  PLAYLIST: 'playlist',
};

const ViewContext = createContext(null);

export function ViewProvider({ children }) {
  const [currentView, setCurrentView] = useState(VIEW_TYPES.LIBRARY);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);

  const navigateToLibrary = useCallback(() => {
    setCurrentView(VIEW_TYPES.LIBRARY);
    setSelectedPlaylistId(null);
  }, []);

  const navigateToAlbums = useCallback(() => {
    setCurrentView(VIEW_TYPES.ALBUMS);
    setSelectedPlaylistId(null);
  }, []);

  const navigateToPlaylist = useCallback((playlistId) => {
    setCurrentView(VIEW_TYPES.PLAYLIST);
    setSelectedPlaylistId(playlistId);
  }, []);

  const value = {
    currentView,
    selectedPlaylistId,
    navigateToLibrary,
    navigateToAlbums,
    navigateToPlaylist,
  };

  return (
    <ViewContext.Provider value={value}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}

export default ViewContext;
