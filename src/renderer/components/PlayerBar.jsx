// PlayerBar - fixed top bar with playback controls, progress, and now playing info
// Implements playback UI with progress bar dragging, artwork, and disabled states

import { useState, useRef, useCallback, useEffect } from 'react';
import './PlayerBar.css';

function PlayerBar({
  isPlaying = false,
  isLoading = false,
  currentTrack = null,
  currentTime = 0,
  duration = 0,
  onPlayPause = () => {},
  onPrevious = () => {},
  onNext = () => {},
  onSeek = () => {},
  onVolumeChange = () => {},
  volume = 1,
  hasPrevious = false,
  hasNext = false,
}) {
  // Dragging state for progress bar
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const progressRef = useRef(null);

  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Use drag time when dragging, otherwise use current time
  const displayTime = isDragging ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  // Calculate time from mouse position
  const calculateTimeFromEvent = useCallback((e) => {
    if (!progressRef.current || duration <= 0) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    return percent * duration;
  }, [duration]);

  // Progress bar mouse handlers
  const handleProgressMouseDown = useCallback((e) => {
    if (duration <= 0) return;
    setIsDragging(true);
    setDragTime(calculateTimeFromEvent(e));
  }, [duration, calculateTimeFromEvent]);

  const handleProgressMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setDragTime(calculateTimeFromEvent(e));
  }, [isDragging, calculateTimeFromEvent]);

  const handleProgressMouseUp = useCallback((e) => {
    if (!isDragging) return;
    const newTime = calculateTimeFromEvent(e);
    onSeek(newTime);
    setIsDragging(false);
  }, [isDragging, calculateTimeFromEvent, onSeek]);

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e) => handleProgressMouseMove(e);
      const handleGlobalMouseUp = (e) => handleProgressMouseUp(e);

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleProgressMouseMove, handleProgressMouseUp]);

  // Keyboard handler for progress bar
  const handleProgressKeyDown = useCallback((e) => {
    if (duration <= 0) return;

    let newTime = currentTime;
    const step = 5; // 5 second steps

    switch (e.key) {
      case 'ArrowLeft':
        newTime = Math.max(0, currentTime - step);
        e.preventDefault();
        break;
      case 'ArrowRight':
        newTime = Math.min(duration, currentTime + step);
        e.preventDefault();
        break;
      case 'Home':
        newTime = 0;
        e.preventDefault();
        break;
      case 'End':
        newTime = duration;
        e.preventDefault();
        break;
      default:
        return;
    }

    onSeek(newTime);
  }, [duration, currentTime, onSeek]);

  const handleVolumeChange = (e) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  // Determine if controls should be disabled
  const controlsDisabled = !currentTrack && !isLoading;

  return (
    <div className="player-bar">
      <div className="player-bar__controls">
        <button
          className="player-bar__button player-bar__button--prev"
          onClick={onPrevious}
          disabled={!hasPrevious || isLoading}
          aria-label="Previous track"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <button
          className="player-bar__button player-bar__button--play"
          onClick={onPlayPause}
          disabled={controlsDisabled}
          aria-label={isLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <svg className="player-bar__loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="31.4" strokeLinecap="round"/>
            </svg>
          ) : isPlaying ? (
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
          disabled={!hasNext || isLoading}
          aria-label="Next track"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>
      </div>

      <div className="player-bar__progress-section">
        <span className="player-bar__time player-bar__time--current">
          {formatTime(displayTime)}
        </span>

        <div
          ref={progressRef}
          className={`player-bar__progress-track ${isDragging ? 'player-bar__progress-track--dragging' : ''}`}
          onMouseDown={handleProgressMouseDown}
          onKeyDown={handleProgressKeyDown}
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(displayTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuetext={formatTime(displayTime)}
          tabIndex={duration > 0 ? 0 : -1}
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
            {currentTrack.artwork_path ? (
              <img
                className="player-bar__artwork"
                src={`file://${currentTrack.artwork_path}`}
                alt={`${currentTrack.album || currentTrack.title} artwork`}
              />
            ) : (
              <div className="player-bar__artwork player-bar__artwork--placeholder">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
            )}
            <div className="player-bar__track-info">
              <span className="player-bar__track-title">{currentTrack.title}</span>
              <span className="player-bar__track-artist">{currentTrack.artist}</span>
            </div>
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
