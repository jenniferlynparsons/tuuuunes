// Sidebar component tests
import { render, screen } from '@testing-library/react';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  test('renders library sections', () => {
    render(<Sidebar />);

    expect(screen.getByText('LIBRARY')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
  });

  test('renders playlist list', () => {
    const playlists = [
      { id: 1, name: 'Favorites' },
      { id: 2, name: 'Running' }
    ];

    render(<Sidebar playlists={playlists} />);

    expect(screen.getByText('PLAYLISTS')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  test('does not render playlists section when empty', () => {
    render(<Sidebar playlists={[]} />);

    expect(screen.queryByText('PLAYLISTS')).not.toBeInTheDocument();
  });

  test('renders without playlists prop', () => {
    render(<Sidebar />);

    expect(screen.getByText('LIBRARY')).toBeInTheDocument();
    expect(screen.queryByText('PLAYLISTS')).not.toBeInTheDocument();
  });
});
