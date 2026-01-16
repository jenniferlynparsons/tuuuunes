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
      render(<PlayerBar onPlayPause={onPlayPause} />);

      fireEvent.click(screen.getByLabelText('Play'));

      expect(onPlayPause).toHaveBeenCalledTimes(1);
    });

    test('calls onPrevious when previous button clicked', () => {
      const onPrevious = jest.fn();
      render(<PlayerBar onPrevious={onPrevious} />);

      fireEvent.click(screen.getByLabelText('Previous track'));

      expect(onPrevious).toHaveBeenCalledTimes(1);
    });

    test('calls onNext when next button clicked', () => {
      const onNext = jest.fn();
      render(<PlayerBar onNext={onNext} />);

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

    test('shows separator between title and artist', () => {
      const track = { title: 'Test Song', artist: 'Test Artist' };
      render(<PlayerBar currentTrack={track} />);

      expect(screen.getByText('—', { exact: false })).toBeInTheDocument();
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

      fireEvent.click(progressTrack, { clientX: 50 });

      expect(onSeek).toHaveBeenCalledWith(50);
    });
  });
});
