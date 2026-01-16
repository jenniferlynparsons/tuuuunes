// App component tests
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  describe('Layout', () => {
    test('renders player bar', () => {
      render(<App />);

      expect(screen.getByLabelText('Play')).toBeInTheDocument();
      expect(screen.getByLabelText('Volume')).toBeInTheDocument();
    });

    test('renders sidebar with library navigation', () => {
      render(<App />);

      expect(screen.getByText('LIBRARY')).toBeInTheDocument();
      // Music appears in sidebar and as view title, so check within sidebar
      const sidebar = screen.getByRole('complementary'); // aside element
      expect(sidebar).toHaveTextContent('Music');
      expect(sidebar).toHaveTextContent('Albums');
    });

    test('renders sidebar with playlists section', () => {
      render(<App />);

      expect(screen.getByText('PLAYLISTS')).toBeInTheDocument();
      expect(screen.getByText('Favorites')).toBeInTheDocument();
      expect(screen.getByText('Recently Added')).toBeInTheDocument();
      expect(screen.getByText('Workout Mix')).toBeInTheDocument();
    });

    test('renders main content area', () => {
      render(<App />);

      expect(screen.getByRole('heading', { name: 'Music' })).toBeInTheDocument();
    });
  });

  describe('View Navigation', () => {
    test('clicking Albums in sidebar changes main content', () => {
      render(<App />);

      fireEvent.click(screen.getByText('Albums'));

      expect(screen.getByRole('heading', { name: 'Albums' })).toBeInTheDocument();
    });

    test('clicking playlist in sidebar shows playlist view', () => {
      render(<App />);

      fireEvent.click(screen.getByText('Favorites'));

      expect(screen.getByRole('heading', { name: 'Playlist' })).toBeInTheDocument();
    });

    test('can navigate back to Music from other views', () => {
      render(<App />);

      // Go to Albums
      fireEvent.click(screen.getByText('Albums'));
      expect(screen.getByRole('heading', { name: 'Albums' })).toBeInTheDocument();

      // Go back to Music
      fireEvent.click(screen.getByText('Music'));
      expect(screen.getByRole('heading', { name: 'Music' })).toBeInTheDocument();
    });
  });

  describe('Player Controls', () => {
    test('play button toggles to pause when clicked', () => {
      render(<App />);

      // Initially shows play
      expect(screen.getByLabelText('Play')).toBeInTheDocument();

      // Click play
      fireEvent.click(screen.getByLabelText('Play'));

      // Now shows pause
      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });

    test('shows no track selected initially', () => {
      render(<App />);

      expect(screen.getByText('No track selected')).toBeInTheDocument();
    });

    test('volume slider is interactive', () => {
      render(<App />);

      const volumeSlider = screen.getByLabelText('Volume');
      fireEvent.change(volumeSlider, { target: { value: '0.5' } });

      expect(volumeSlider).toHaveValue('0.5');
    });
  });
});
