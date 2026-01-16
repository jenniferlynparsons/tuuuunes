// App - Main application component
// Three-panel layout: PlayerBar (top), Sidebar (left), MainContent (right)

import React, { useState } from 'react';
import { ViewProvider } from './contexts/ViewContext';
import PlayerBar from './components/PlayerBar';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import './App.css';

function App() {
  // Playback state - will be managed by audio engine in Phase 2
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Mock playlists - will be fetched from database in later phase
  const [playlists] = useState([
    { id: 1, name: 'Favorites' },
    { id: 2, name: 'Recently Added' },
    { id: 3, name: 'Workout Mix' },
  ]);

  // Playback handlers - stubs for now, Phase 2 will implement
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    // Will be implemented in Phase 2
  };

  const handleNext = () => {
    // Will be implemented in Phase 2
  };

  const handleSeek = (time) => {
    setCurrentTime(time);
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
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
