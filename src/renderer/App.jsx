// App - Main application component
// Three-panel layout: PlayerBar (top), Sidebar (left), MainContent (right)

import { useState, useEffect, useRef, useCallback } from 'react';
import { ViewProvider } from './contexts/ViewContext';
import PlayerBar from './components/PlayerBar';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import AudioEngine from './AudioEngine';
import QueueManager from './QueueManager';
import './App.css';

function App() {
  // Audio engine and queue refs - persist across renders
  const audioEngineRef = useRef(null);
  const queueManagerRef = useRef(null);
  const timeUpdateIntervalRef = useRef(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Queue state
  const [hasPrevious, setHasPrevious] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  // Mock playlists - will be fetched from database in later phase
  const [playlists] = useState([
    { id: 1, name: 'Favorites' },
    { id: 2, name: 'Recently Added' },
    { id: 3, name: 'Workout Mix' },
  ]);

  // Update queue navigation state
  const updateQueueState = useCallback(() => {
    if (queueManagerRef.current) {
      setHasPrevious(queueManagerRef.current.hasPrevious() || currentTime > 3);
      setHasNext(queueManagerRef.current.hasNext());
    }
  }, [currentTime]);

  // Initialize audio engine and queue manager on mount
  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    queueManagerRef.current = new QueueManager();

    // Set up track ended callback - auto-advance to next track
    audioEngineRef.current.onTrackEnded = () => {
      if (queueManagerRef.current && queueManagerRef.current.hasNext()) {
        const nextTrack = queueManagerRef.current.next();
        if (nextTrack) {
          // Use setTimeout to avoid state updates during render
          setTimeout(() => {
            playTrackInternal(nextTrack);
          }, 0);
        }
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    // Set up error callback
    audioEngineRef.current.onError = (error) => {
      console.error('Audio playback error:', error);
      setIsLoading(false);
      setIsPlaying(false);
    };

    // Cleanup on unmount
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
      }
    };
  }, []);

  // Time update interval - runs while playing
  useEffect(() => {
    if (isPlaying) {
      timeUpdateIntervalRef.current = setInterval(() => {
        if (audioEngineRef.current) {
          const time = audioEngineRef.current.getCurrentTime();
          setCurrentTime(time);
        }
      }, 100); // 10 updates per second
    } else {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    }

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, [isPlaying]);

  // Update queue state when current time changes (for previous button behavior)
  useEffect(() => {
    updateQueueState();
  }, [currentTime, updateQueueState]);

  // Internal function to load and play a track (used by queue navigation)
  const playTrackInternal = async (track) => {
    if (!audioEngineRef.current || !track?.file_path) return;

    setIsLoading(true);
    try {
      const loaded = await audioEngineRef.current.loadTrack(track.file_path);
      setCurrentTrack(track);
      setDuration(loaded.duration);
      setCurrentTime(0);

      audioEngineRef.current.play();
      setIsPlaying(true);
      updateQueueState();
    } catch (error) {
      console.error('Failed to load track:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load and play a track (public API - also sets queue)
  const playTrack = useCallback(async (track, queue = null, startIndex = 0) => {
    if (!audioEngineRef.current || !track?.file_path) return;

    // If queue provided, set it in the queue manager
    if (queue && queueManagerRef.current) {
      queueManagerRef.current.setQueue(queue);
      queueManagerRef.current.playTrackAt(startIndex);
    }

    await playTrackInternal(track);
  }, [updateQueueState]);

  // Playback handlers
  const handlePlayPause = useCallback(() => {
    if (!audioEngineRef.current) return;

    if (isPlaying) {
      audioEngineRef.current.pause();
      setIsPlaying(false);
    } else {
      audioEngineRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handlePrevious = useCallback(async () => {
    if (!audioEngineRef.current || !queueManagerRef.current) return;

    // If more than 3 seconds into track, restart current track
    if (currentTime > 3) {
      audioEngineRef.current.seek(0);
      setCurrentTime(0);
      return;
    }

    // Otherwise, go to previous track if available
    const prevTrack = queueManagerRef.current.previous();
    if (prevTrack) {
      await playTrackInternal(prevTrack);
    }
  }, [currentTime]);

  const handleNext = useCallback(async () => {
    if (!audioEngineRef.current || !queueManagerRef.current) return;

    const nextTrack = queueManagerRef.current.next();
    if (nextTrack) {
      await playTrackInternal(nextTrack);
    }
  }, []);

  const handleSeek = useCallback((time) => {
    if (!audioEngineRef.current) return;

    audioEngineRef.current.seek(time);
    setCurrentTime(time);
  }, []);

  const handleVolumeChange = useCallback((newVolume) => {
    if (!audioEngineRef.current) return;

    audioEngineRef.current.setVolume(newVolume);
    setVolume(newVolume);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case ' ':
          // Space - Play/Pause
          e.preventDefault();
          handlePlayPause();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause]);

  // Expose playTrack for MainContent to use (will be replaced by context in Ticket 2.4)
  const playbackHandlers = {
    playTrack,
    isLoading
  };

  return (
    <ViewProvider>
      <div className="app">
        <PlayerBar
          isPlaying={isPlaying}
          isLoading={isLoading}
          currentTrack={currentTrack}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          onPlayPause={handlePlayPause}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
        />
        <div className="app__main">
          <Sidebar playlists={playlists} />
          <MainContent />
        </div>
      </div>
    </ViewProvider>
  );
}

export default App;
