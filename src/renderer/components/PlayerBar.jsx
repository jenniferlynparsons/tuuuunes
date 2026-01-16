// PlayerBar - fixed top bar with playback controls, progress, and now playing info
// This is the UI shell - actual playback functionality comes in Phase 2

import React from 'react';
import './PlayerBar.css';

function PlayerBar({
  isPlaying = false,
  currentTrack = null,
  currentTime = 0,
  duration = 0,
  onPlayPause = () => {},
  onPrevious = () => {},
  onNext = () => {},
  onSeek = () => {},
  onVolumeChange = () => {},
  volume = 1,
}) {
  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    onSeek(newTime);
  };

  const handleVolumeChange = (e) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  return (
    <div className="player-bar">
      <div className="player-bar__controls">
        <button
          className="player-bar__button player-bar__button--prev"
          onClick={onPrevious}
          aria-label="Previous track"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <button
          className="player-bar__button player-bar__button--play"
          onClick={onPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <button
          className="player-bar__button player-bar__button--next"
          onClick={onNext}
          aria-label="Next track"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>
      </div>

      <div className="player-bar__progress-section">
        <span className="player-bar__time player-bar__time--current">
          {formatTime(currentTime)}
        </span>

        <div
          className="player-bar__progress-track"
          onClick={handleProgressClick}
          role="slider"
          aria-label="Seek"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
          tabIndex={0}
        >
          <div
            className="player-bar__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="player-bar__progress-handle"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        <span className="player-bar__time player-bar__time--duration">
          {formatTime(duration)}
        </span>
      </div>

      <div className="player-bar__now-playing">
        {currentTrack ? (
          <>
            <span className="player-bar__track-title">{currentTrack.title}</span>
            <span className="player-bar__track-separator"> — </span>
            <span className="player-bar__track-artist">{currentTrack.artist}</span>
          </>
        ) : (
          <span className="player-bar__no-track">No track selected</span>
        )}
      </div>

      <div className="player-bar__volume">
        <svg className="player-bar__volume-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        <input
          type="range"
          className="player-bar__volume-slider"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}

export default PlayerBar;
