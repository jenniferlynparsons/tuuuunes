// PlayerBar component tests
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerBar from './PlayerBar';

describe('PlayerBar Component', () => {
  describe('Playback Controls', () => {
    test('renders play, previous, and next buttons', () => {
      render(<PlayerBar />);

      expect(screen.getByLabelText('Play')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous track')).toBeInTheDocument();
      expect(screen.getByLabelText('Next track')).toBeInTheDocument();
    });

    test('shows pause button when playing', () => {
      render(<PlayerBar isPlaying={true} />);

      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
      expect(screen.queryByLabelText('Play')).not.toBeInTheDocument();
    });

    test('shows play button when paused', () => {
      render(<PlayerBar isPlaying={false} />);

      expect(screen.getByLabelText('Play')).toBeInTheDocument();
      expect(screen.queryByLabelText('Pause')).not.toBeInTheDocument();
    });

    test('calls onPlayPause when play button clicked', () => {
      const onPlayPause = jest.fn();
      const track = { title: 'Test', artist: 'Artist' };
      render(<PlayerBar onPlayPause={onPlayPause} currentTrack={track} />);

      fireEvent.click(screen.getByLabelText('Play'));

      expect(onPlayPause).toHaveBeenCalledTimes(1);
    });

    test('calls onPrevious when previous button clicked', () => {
      const onPrevious = jest.fn();
      render(<PlayerBar onPrevious={onPrevious} hasPrevious={true} />);

      fireEvent.click(screen.getByLabelText('Previous track'));

      expect(onPrevious).toHaveBeenCalledTimes(1);
    });

    test('calls onNext when next button clicked', () => {
      const onNext = jest.fn();
      render(<PlayerBar onNext={onNext} hasNext={true} />);

      fireEvent.click(screen.getByLabelText('Next track'));

      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Progress Bar', () => {
    test('displays current time and duration', () => {
      render(<PlayerBar currentTime={94} duration={212} />);

      expect(screen.getByText('1:34')).toBeInTheDocument();
      expect(screen.getByText('3:32')).toBeInTheDocument();
    });

    test('displays 0:00 for zero values', () => {
      render(<PlayerBar currentTime={0} duration={0} />);

      expect(screen.getAllByText('0:00')).toHaveLength(2);
    });

    test('handles edge case with NaN duration', () => {
      render(<PlayerBar currentTime={0} duration={NaN} />);

      expect(screen.getAllByText('0:00')).toHaveLength(2);
    });

    test('progress track has slider role for accessibility', () => {
      render(<PlayerBar />);

      expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument();
    });
  });

  describe('Now Playing Info', () => {
    test('shows no track selected when no track', () => {
      render(<PlayerBar currentTrack={null} />);

      expect(screen.getByText('No track selected')).toBeInTheDocument();
    });

    test('displays track title and artist when track provided', () => {
      const track = { title: 'Test Song', artist: 'Test Artist' };
      render(<PlayerBar currentTrack={track} />);

      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

  });

  describe('Volume Control', () => {
    test('renders volume slider', () => {
      render(<PlayerBar />);

      expect(screen.getByLabelText('Volume')).toBeInTheDocument();
    });

    test('volume slider has correct default value', () => {
      render(<PlayerBar volume={1} />);

      const slider = screen.getByLabelText('Volume');
      expect(slider).toHaveValue('1');
    });

    test('calls onVolumeChange when slider changed', () => {
      const onVolumeChange = jest.fn();
      render(<PlayerBar onVolumeChange={onVolumeChange} />);

      const slider = screen.getByLabelText('Volume');
      fireEvent.change(slider, { target: { value: '0.5' } });

      expect(onVolumeChange).toHaveBeenCalledWith(0.5);
    });

    test('volume slider has min 0 and max 1', () => {
      render(<PlayerBar />);

      const slider = screen.getByLabelText('Volume');
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '1');
    });
  });

  describe('Time Formatting', () => {
    test('formats seconds correctly', () => {
      render(<PlayerBar currentTime={5} duration={60} />);

      expect(screen.getByText('0:05')).toBeInTheDocument();
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    test('formats longer durations correctly', () => {
      render(<PlayerBar currentTime={599} duration={3661} />);

      expect(screen.getByText('9:59')).toBeInTheDocument();
      expect(screen.getByText('61:01')).toBeInTheDocument();
    });
  });

  describe('Seek Functionality', () => {
    test('calls onSeek with calculated time when progress bar clicked', () => {
      const onSeek = jest.fn();
      render(<PlayerBar duration={100} onSeek={onSeek} />);

      const progressTrack = screen.getByRole('slider', { name: 'Seek' });

      // Mock getBoundingClientRect for the progress track
      progressTrack.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        width: 100,
      }));

      fireEvent.mouseDown(progressTrack, { clientX: 50 });
      fireEvent.mouseUp(progressTrack, { clientX: 50 });

      expect(onSeek).toHaveBeenCalledWith(50);
    });

    test('supports keyboard navigation on progress bar', () => {
      const onSeek = jest.fn();
      render(<PlayerBar duration={100} currentTime={50} onSeek={onSeek} />);

      const progressTrack = screen.getByRole('slider', { name: 'Seek' });

      // Arrow right should seek forward
      fireEvent.keyDown(progressTrack, { key: 'ArrowRight' });
      expect(onSeek).toHaveBeenCalledWith(55); // 50 + 5 second step

      // Arrow left should seek backward
      fireEvent.keyDown(progressTrack, { key: 'ArrowLeft' });
      expect(onSeek).toHaveBeenCalledWith(45); // 50 - 5 second step
    });

    test('Home key seeks to beginning', () => {
      const onSeek = jest.fn();
      render(<PlayerBar duration={100} currentTime={50} onSeek={onSeek} />);

      const progressTrack = screen.getByRole('slider', { name: 'Seek' });
      fireEvent.keyDown(progressTrack, { key: 'Home' });

      expect(onSeek).toHaveBeenCalledWith(0);
    });

    test('End key seeks to end', () => {
      const onSeek = jest.fn();
      render(<PlayerBar duration={100} currentTime={50} onSeek={onSeek} />);

      const progressTrack = screen.getByRole('slider', { name: 'Seek' });
      fireEvent.keyDown(progressTrack, { key: 'End' });

      expect(onSeek).toHaveBeenCalledWith(100);
    });
  });

  describe('Disabled States', () => {
    test('previous button is disabled when hasPrevious is false', () => {
      render(<PlayerBar hasPrevious={false} />);

      expect(screen.getByLabelText('Previous track')).toBeDisabled();
    });

    test('previous button is enabled when hasPrevious is true', () => {
      render(<PlayerBar hasPrevious={true} />);

      expect(screen.getByLabelText('Previous track')).not.toBeDisabled();
    });

    test('next button is disabled when hasNext is false', () => {
      render(<PlayerBar hasNext={false} />);

      expect(screen.getByLabelText('Next track')).toBeDisabled();
    });

    test('next button is enabled when hasNext is true', () => {
      render(<PlayerBar hasNext={true} />);

      expect(screen.getByLabelText('Next track')).not.toBeDisabled();
    });

    test('buttons are disabled during loading', () => {
      render(<PlayerBar isLoading={true} hasPrevious={true} hasNext={true} />);

      expect(screen.getByLabelText('Previous track')).toBeDisabled();
      expect(screen.getByLabelText('Next track')).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    test('shows loading spinner when isLoading is true', () => {
      render(<PlayerBar isLoading={true} />);

      expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    });

    test('shows play button when not loading and not playing', () => {
      render(<PlayerBar isLoading={false} isPlaying={false} />);

      expect(screen.getByLabelText('Play')).toBeInTheDocument();
    });

    test('shows pause button when not loading and playing', () => {
      render(<PlayerBar isLoading={false} isPlaying={true} />);

      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });
  });

  describe('Artwork Display', () => {
    test('shows artwork when track has artwork_path', () => {
      const track = {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        artwork_path: '/path/to/artwork.jpg',
      };
      render(<PlayerBar currentTrack={track} />);

      const artwork = screen.getByAltText('Test Album artwork');
      expect(artwork).toBeInTheDocument();
      expect(artwork).toHaveAttribute('src', 'file:///path/to/artwork.jpg');
    });

    test('shows placeholder when track has no artwork', () => {
      const track = {
        title: 'Test Song',
        artist: 'Test Artist',
      };
      render(<PlayerBar currentTrack={track} />);

      // Placeholder should exist (div with placeholder class) but no img element
      const placeholder = document.querySelector('.player-bar__artwork--placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    test('uses track title for alt text when no album', () => {
      const track = {
        title: 'Test Song',
        artist: 'Test Artist',
        artwork_path: '/path/to/artwork.jpg',
      };
      render(<PlayerBar currentTrack={track} />);

      const artwork = screen.getByAltText('Test Song artwork');
      expect(artwork).toBeInTheDocument();
    });
  });

  describe('Track Info Layout', () => {
    test('displays title and artist in separate elements', () => {
      const track = {
        title: 'Test Song',
        artist: 'Test Artist',
      };
      render(<PlayerBar currentTrack={track} />);

      const title = screen.getByText('Test Song');
      const artist = screen.getByText('Test Artist');

      expect(title).toHaveClass('player-bar__track-title');
      expect(artist).toHaveClass('player-bar__track-artist');
    });
  });
});
