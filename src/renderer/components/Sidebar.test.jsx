// Sidebar component tests
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';
import { ViewProvider, VIEW_TYPES } from '../contexts/ViewContext';

// Helper to render Sidebar with ViewProvider
const renderSidebar = (props = {}) => {
  return render(
    <ViewProvider>
      <Sidebar {...props} />
    </ViewProvider>
  );
};

describe('Sidebar Component', () => {
  describe('Library Section', () => {
    test('renders library section with Music and Albums', () => {
      renderSidebar();

      expect(screen.getByText('LIBRARY')).toBeInTheDocument();
      expect(screen.getByText('Music')).toBeInTheDocument();
      expect(screen.getByText('Albums')).toBeInTheDocument();
    });

    test('Music item is active by default', () => {
      renderSidebar();

      const musicItem = screen.getByText('Music').closest('li');
      expect(musicItem).toHaveClass('sidebar__item--active');
    });

    test('clicking Albums switches to album view', () => {
      renderSidebar();

      const albumsItem = screen.getByText('Albums').closest('li');
      fireEvent.click(albumsItem);

      expect(albumsItem).toHaveClass('sidebar__item--active');
      expect(screen.getByText('Music').closest('li')).not.toHaveClass('sidebar__item--active');
    });

    test('clicking Music switches back to library view', () => {
      renderSidebar();

      // First go to albums
      fireEvent.click(screen.getByText('Albums'));
      // Then go back to music
      fireEvent.click(screen.getByText('Music'));

      expect(screen.getByText('Music').closest('li')).toHaveClass('sidebar__item--active');
    });

    test('keyboard navigation works with Enter key', () => {
      renderSidebar();

      const albumsItem = screen.getByText('Albums').closest('li');
      fireEvent.keyDown(albumsItem, { key: 'Enter' });

      expect(albumsItem).toHaveClass('sidebar__item--active');
    });
  });

  describe('Playlists Section', () => {
    test('renders playlists section title', () => {
      renderSidebar();

      expect(screen.getByText('PLAYLISTS')).toBeInTheDocument();
    });

    test('shows empty message when no playlists', () => {
      renderSidebar({ playlists: [] });

      expect(screen.getByText('No playlists yet')).toBeInTheDocument();
    });

    test('renders playlist list when playlists provided', () => {
      const playlists = [
        { id: 1, name: 'Favorites' },
        { id: 2, name: 'Running' },
      ];

      renderSidebar({ playlists });

      expect(screen.getByText('Favorites')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    test('clicking playlist switches to playlist view', () => {
      const playlists = [{ id: 1, name: 'Favorites' }];
      renderSidebar({ playlists });

      const playlistItem = screen.getByText('Favorites').closest('li');
      fireEvent.click(playlistItem);

      expect(playlistItem).toHaveClass('sidebar__item--active');
      expect(screen.getByText('Music').closest('li')).not.toHaveClass('sidebar__item--active');
    });

    test('clicking different playlist switches active state', () => {
      const playlists = [
        { id: 1, name: 'Favorites' },
        { id: 2, name: 'Running' },
      ];
      renderSidebar({ playlists });

      // Click first playlist
      fireEvent.click(screen.getByText('Favorites'));
      expect(screen.getByText('Favorites').closest('li')).toHaveClass('sidebar__item--active');

      // Click second playlist
      fireEvent.click(screen.getByText('Running'));
      expect(screen.getByText('Running').closest('li')).toHaveClass('sidebar__item--active');
      expect(screen.getByText('Favorites').closest('li')).not.toHaveClass('sidebar__item--active');
    });
  });

  describe('Accessibility', () => {
    test('all items have role="button"', () => {
      const playlists = [{ id: 1, name: 'Favorites' }];
      renderSidebar({ playlists });

      expect(screen.getByText('Music').closest('li')).toHaveAttribute('role', 'button');
      expect(screen.getByText('Albums').closest('li')).toHaveAttribute('role', 'button');
      expect(screen.getByText('Favorites').closest('li')).toHaveAttribute('role', 'button');
    });

    test('all items are focusable', () => {
      const playlists = [{ id: 1, name: 'Favorites' }];
      renderSidebar({ playlists });

      expect(screen.getByText('Music').closest('li')).toHaveAttribute('tabIndex', '0');
      expect(screen.getByText('Albums').closest('li')).toHaveAttribute('tabIndex', '0');
      expect(screen.getByText('Favorites').closest('li')).toHaveAttribute('tabIndex', '0');
    });
  });
});
