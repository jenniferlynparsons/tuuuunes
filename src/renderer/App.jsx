// App - Main application component
// Three-panel layout: PlayerBar (top), Sidebar (left), MainContent (right)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ViewProvider } from './contexts/ViewContext';
import PlayerBar from './components/PlayerBar';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import AudioEngine from './AudioEngine';
import './App.css';

function App() {
  // Audio engine ref - persists across renders
  const audioEngineRef = useRef(null);
  const timeUpdateIntervalRef = useRef(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Mock playlists - will be fetched from database in later phase
  const [playlists] = useState([
    { id: 1, name: 'Favorites' },
    { id: 2, name: 'Recently Added' },
    { id: 3, name: 'Workout Mix' },
  ]);

  // Initialize audio engine on mount
  useEffect(() => {
    audioEngineRef.current = new AudioEngine();

    // Set up track ended callback
    audioEngineRef.current.onTrackEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // Will trigger next track in queue (Ticket 2.2)
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
          setCurrentTime(audioEngineRef.current.getCurrentTime());
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

  // Load and play a track
  const playTrack = useCallback(async (track) => {
    if (!audioEngineRef.current || !track?.file_path) return;

    setIsLoading(true);
    try {
      const loaded = await audioEngineRef.current.loadTrack(track.file_path);
      setCurrentTrack(track);
      setDuration(loaded.duration);
      setCurrentTime(0);

      audioEngineRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to load track:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const handlePrevious = useCallback(() => {
    // Will be implemented with queue (Ticket 2.2)
    // For now, restart current track if >3 seconds in
    if (!audioEngineRef.current) return;

    if (currentTime > 3) {
      audioEngineRef.current.seek(0);
      setCurrentTime(0);
    }
  }, [currentTime]);

  const handleNext = useCallback(() => {
    // Will be implemented with queue (Ticket 2.2)
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
          currentTrack={currentTrack}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          onPlayPause={handlePlayPause}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
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
