// MainContent component tests
import { render, screen, fireEvent } from '@testing-library/react';
import MainContent from './MainContent';
import Sidebar from './Sidebar';
import { ViewProvider } from '../contexts/ViewContext';

// Helper to render with context and sidebar for navigation testing
const renderWithNavigation = () => {
  return render(
    <ViewProvider>
      <Sidebar playlists={[{ id: 1, name: 'Test Playlist' }]} />
      <MainContent />
    </ViewProvider>
  );
};

// Helper for just MainContent
const renderMainContent = () => {
  return render(
    <ViewProvider>
      <MainContent />
    </ViewProvider>
  );
};

describe('MainContent Component', () => {
  describe('Library View (default)', () => {
    test('shows Music title by default', () => {
      renderMainContent();

      expect(screen.getByRole('heading', { name: 'Music' })).toBeInTheDocument();
    });

    test('shows placeholder message for empty library', () => {
      renderMainContent();

      expect(screen.getByText('Your music library will appear here')).toBeInTheDocument();
      expect(screen.getByText('Import music to get started')).toBeInTheDocument();
    });
  });

  describe('Albums View', () => {
    test('shows Albums title when navigating to albums', () => {
      renderWithNavigation();

      fireEvent.click(screen.getByText('Albums'));

      expect(screen.getByRole('heading', { name: 'Albums' })).toBeInTheDocument();
    });

    test('shows album placeholder message', () => {
      renderWithNavigation();

      fireEvent.click(screen.getByText('Albums'));

      expect(screen.getByText('Album gallery will appear here')).toBeInTheDocument();
      expect(screen.getByText('Browse your music by album artwork')).toBeInTheDocument();
    });
  });

  describe('Playlist View', () => {
    test('shows Playlist title when navigating to playlist', () => {
      renderWithNavigation();

      fireEvent.click(screen.getByText('Test Playlist'));

      expect(screen.getByRole('heading', { name: 'Playlist' })).toBeInTheDocument();
    });

    test('shows playlist placeholder with id', () => {
      renderWithNavigation();

      fireEvent.click(screen.getByText('Test Playlist'));

      expect(screen.getByText(/Playlist 1 will appear here/)).toBeInTheDocument();
    });

    test('shows playlist hint message', () => {
      renderWithNavigation();

      fireEvent.click(screen.getByText('Test Playlist'));

      expect(screen.getByText('Add tracks to build your playlist')).toBeInTheDocument();
    });
  });

  describe('View Switching', () => {
    test('switching from library to albums changes content', () => {
      renderWithNavigation();

      // Verify library view first
      expect(screen.getByRole('heading', { name: 'Music' })).toBeInTheDocument();

      // Switch to albums
      fireEvent.click(screen.getByText('Albums'));

      // Verify albums view
      expect(screen.getByRole('heading', { name: 'Albums' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Music' })).not.toBeInTheDocument();
    });

    test('switching from playlist back to library works', () => {
      renderWithNavigation();

      // Go to playlist
      fireEvent.click(screen.getByText('Test Playlist'));
      expect(screen.getByRole('heading', { name: 'Playlist' })).toBeInTheDocument();

      // Go back to library
      fireEvent.click(screen.getByText('Music'));
      expect(screen.getByRole('heading', { name: 'Music' })).toBeInTheDocument();
    });
  });
});
