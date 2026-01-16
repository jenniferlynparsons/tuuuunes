// ViewContext tests
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewProvider, useView, VIEW_TYPES } from './ViewContext';

// Test component that uses the context
function TestConsumer() {
  const { currentView, selectedPlaylistId, navigateToLibrary, navigateToAlbums, navigateToPlaylist } = useView();

  return (
    <div>
      <span data-testid="current-view">{currentView}</span>
      <span data-testid="playlist-id">{selectedPlaylistId ?? 'null'}</span>
      <button onClick={navigateToLibrary}>Go to Library</button>
      <button onClick={navigateToAlbums}>Go to Albums</button>
      <button onClick={() => navigateToPlaylist(42)}>Go to Playlist 42</button>
    </div>
  );
}

describe('ViewContext', () => {
  describe('VIEW_TYPES', () => {
    test('exports correct view type constants', () => {
      expect(VIEW_TYPES.LIBRARY).toBe('library');
      expect(VIEW_TYPES.ALBUMS).toBe('albums');
      expect(VIEW_TYPES.PLAYLIST).toBe('playlist');
    });
  });

  describe('ViewProvider', () => {
    test('provides default state with library view', () => {
      render(
        <ViewProvider>
          <TestConsumer />
        </ViewProvider>
      );

      expect(screen.getByTestId('current-view')).toHaveTextContent('library');
      expect(screen.getByTestId('playlist-id')).toHaveTextContent('null');
    });
  });

  describe('Navigation', () => {
    test('navigateToLibrary sets library view', () => {
      render(
        <ViewProvider>
          <TestConsumer />
        </ViewProvider>
      );

      // First go somewhere else
      fireEvent.click(screen.getByText('Go to Albums'));
      expect(screen.getByTestId('current-view')).toHaveTextContent('albums');

      // Then go to library
      fireEvent.click(screen.getByText('Go to Library'));
      expect(screen.getByTestId('current-view')).toHaveTextContent('library');
      expect(screen.getByTestId('playlist-id')).toHaveTextContent('null');
    });

    test('navigateToAlbums sets albums view', () => {
      render(
        <ViewProvider>
          <TestConsumer />
        </ViewProvider>
      );

      fireEvent.click(screen.getByText('Go to Albums'));

      expect(screen.getByTestId('current-view')).toHaveTextContent('albums');
      expect(screen.getByTestId('playlist-id')).toHaveTextContent('null');
    });

    test('navigateToPlaylist sets playlist view and id', () => {
      render(
        <ViewProvider>
          <TestConsumer />
        </ViewProvider>
      );

      fireEvent.click(screen.getByText('Go to Playlist 42'));

      expect(screen.getByTestId('current-view')).toHaveTextContent('playlist');
      expect(screen.getByTestId('playlist-id')).toHaveTextContent('42');
    });

    test('navigating away from playlist clears playlist id', () => {
      render(
        <ViewProvider>
          <TestConsumer />
        </ViewProvider>
      );

      // Go to playlist
      fireEvent.click(screen.getByText('Go to Playlist 42'));
      expect(screen.getByTestId('playlist-id')).toHaveTextContent('42');

      // Go to albums
      fireEvent.click(screen.getByText('Go to Albums'));
      expect(screen.getByTestId('playlist-id')).toHaveTextContent('null');
    });
  });

  describe('useView hook', () => {
    test('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useView must be used within a ViewProvider');

      consoleSpy.mockRestore();
    });
  });
});
