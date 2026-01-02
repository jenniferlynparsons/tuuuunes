# Phase 2: Playback Core - Implementation Tickets

## Overview
Phase 2 implements the audio playback engine using Web Audio API, queue management, playback controls, and volume control. This is the heart of the music player - everything else supports this functionality. Estimated 1-2 weeks of development time.

---

## TICKET 2.1: Web Audio API Integration
**Priority:** P0 (Blocking)  
**Estimate:** 8 hours

### Description
Set up Web Audio API for playing audio files. Create audio context, handle audio buffer loading, and implement basic play/pause/stop functionality.

### Technical Architecture

**Audio Engine Class:**
```javascript
class AudioEngine {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.sourceNode = null;
    this.gainNode = this.audioContext.createGain();
    this.analyserNode = this.audioContext.createAnalyser();
    this.currentTrack = null;
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;
  }
  
  async loadTrack(filePath) {
    // Load audio file as ArrayBuffer
    const response = await fetch(`file://${filePath}`);
    const arrayBuffer = await response.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    this.currentTrack = {
      buffer: audioBuffer,
      filePath: filePath,
      duration: audioBuffer.duration
    };
    
    return this.currentTrack;
  }
  
  play() {
    if (!this.currentTrack) return;
    
    // Create new source node (can only be used once)
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.currentTrack.buffer;
    
    // Connect nodes: source → gain → analyser → destination
    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
    
    // Start playback
    const offset = this.pauseTime;
    this.sourceNode.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this.isPlaying = true;
    
    // Handle track end
    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.onTrackEnded();
      }
    };
  }
  
  pause() {
    if (!this.sourceNode || !this.isPlaying) return;
    
    this.pauseTime = this.getCurrentTime();
    this.sourceNode.stop();
    this.isPlaying = false;
  }
  
  stop() {
    if (this.sourceNode) {
      this.sourceNode.stop();
    }
    this.pauseTime = 0;
    this.isPlaying = false;
  }
  
  getCurrentTime() {
    if (!this.isPlaying) return this.pauseTime;
    return this.audioContext.currentTime - this.startTime;
  }
  
  seek(time) {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.pauseTime = time;
    if (wasPlaying) {
      this.play();
    }
  }
  
  setVolume(value) {
    // value: 0.0 to 1.0
    this.gainNode.gain.value = value;
  }
}
```

### Acceptance Criteria
- [ ] AudioContext initializes successfully
- [ ] Can load and decode MP3, FLAC, M4A files
- [ ] Play/pause/stop controls work
- [ ] Seek to position works
- [ ] Volume control works (0-100%)
- [ ] Track end event fires correctly
- [ ] No audio artifacts or clicking

### File Loading Notes
- Use Electron's protocol handler for file:// URLs
- Handle CORS properly for local files
- Decode audio in chunks for large files (streaming)
- Error handling for unsupported codecs

### Browser Compatibility
- Web Audio API supported in Electron (Chromium-based)
- FLAC support may require additional codec
- Test with all three file formats

### Definition of Done
- Can play all supported audio formats
- Playback controls respond instantly (<100ms)
- No memory leaks with repeated play/pause
- Volume changes apply smoothly
- Unit tests pass for AudioEngine class

---

## TICKET 2.2: Playback Queue Management
**Priority:** P0 (Blocking)  
**Estimate:** 6 hours

### Description
Implement queue system for managing playback order, next/previous track navigation, and queue manipulation.

### Queue Features
- Add tracks to queue
- Remove tracks from queue
- Reorder queue
- Clear queue
- Play from queue position
- Auto-advance to next track
- Previous track (restart if >3 seconds, else previous)

### Queue Manager Class
```javascript
class QueueManager {
  constructor() {
    this.queue = [];
    this.currentIndex = -1;
    this.history = [];
  }
  
  setQueue(tracks) {
    this.queue = [...tracks];
    this.currentIndex = 0;
  }
  
  addToQueue(track) {
    this.queue.push(track);
  }
  
  insertNext(track) {
    this.queue.splice(this.currentIndex + 1, 0, track);
  }
  
  removeFromQueue(index) {
    this.queue.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    }
  }
  
  getCurrentTrack() {
    return this.queue[this.currentIndex] || null;
  }
  
  getNextTrack() {
    if (this.currentIndex < this.queue.length - 1) {
      return this.queue[this.currentIndex + 1];
    }
    return null;
  }
  
  getPreviousTrack() {
    if (this.currentIndex > 0) {
      return this.queue[this.currentIndex - 1];
    }
    return null;
  }
  
  next() {
    if (this.currentIndex < this.queue.length - 1) {
      this.history.push(this.queue[this.currentIndex]);
      this.currentIndex++;
      return this.getCurrentTrack();
    }
    return null;
  }
  
  previous() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.getCurrentTrack();
    }
    return null;
  }
  
  playTrackAt(index) {
    if (index >= 0 && index < this.queue.length) {
      this.currentIndex = index;
      return this.getCurrentTrack();
    }
    return null;
  }
  
  clear() {
    this.queue = [];
    this.currentIndex = -1;
  }
  
  getQueue() {
    return this.queue;
  }
}
```

### Acceptance Criteria
- [ ] Queue maintains correct order
- [ ] Current track index tracks properly
- [ ] Next/previous navigation works
- [ ] Can add/remove tracks without disrupting playback
- [ ] Auto-advance on track end
- [ ] Queue persists during session (not across restarts in V1)

### Edge Cases
- Empty queue
- Single track queue
- Remove currently playing track
- Remove track before current position
- Remove track after current position

### Definition of Done
- Queue operations work correctly
- Navigation doesn't skip tracks
- Unit tests cover all queue operations
- Edge cases handled gracefully

---

## TICKET 2.3: Playback Controls UI
**Priority:** P1 (Core feature)  
**Estimate:** 6 hours

### Description
Build playback control interface in PlayerBar component with play/pause, skip, progress bar, and time display.

### UI Components

**PlayerBar Layout:**
```
┌─────────────────────────────────────────────────┐
│ [◀◀] [▶/⏸] [▶▶]  ━━━━━━━●━━━━━━  2:34 / 4:12  │
│ Track Title - Artist Name           [🔊 ▁▂▃▅▇] │
└─────────────────────────────────────────────────┘
```

**Components:**
- PlayPauseButton (toggles state, shows icon)
- PreviousButton
- NextButton
- ProgressBar (seekable scrubber)
- TimeDisplay (current / total)
- VolumeControl (slider)
- NowPlayingInfo (track, artist, artwork thumbnail)

### React Component Structure
```jsx
function PlayerBar({ currentTrack, isPlaying, currentTime, duration, volume }) {
  const handlePlayPause = () => {
    if (isPlaying) {
      window.api.pausePlayback();
    } else {
      window.api.resumePlayback();
    }
  };
  
  const handleSeek = (time) => {
    window.api.seekTo(time);
  };
  
  const handleVolumeChange = (value) => {
    window.api.setVolume(value);
  };
  
  return (
    <div className="player-bar">
      <div className="playback-controls">
        <button onClick={() => window.api.previousTrack()}>
          <Icon name="previous" />
        </button>
        <button onClick={handlePlayPause} className="play-pause">
          <Icon name={isPlaying ? 'pause' : 'play'} />
        </button>
        <button onClick={() => window.api.nextTrack()}>
          <Icon name="next" />
        </button>
      </div>
      
      <ProgressBar 
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
      />
      
      <TimeDisplay current={currentTime} total={duration} />
      
      <NowPlayingInfo track={currentTrack} />
      
      <VolumeControl value={volume} onChange={handleVolumeChange} />
    </div>
  );
}
```

### ProgressBar Implementation
```jsx
function ProgressBar({ currentTime, duration, onSeek }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  
  const progressPercent = (currentTime / duration) * 100;
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    updateDragTime(e);
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      updateDragTime(e);
    }
  };
  
  const handleMouseUp = (e) => {
    if (isDragging) {
      onSeek(dragTime);
      setIsDragging(false);
    }
  };
  
  const updateDragTime = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    setDragTime(percent * duration);
  };
  
  return (
    <div 
      className="progress-bar"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ width: `${progressPercent}%` }}
        />
        <div 
          className="progress-handle"
          style={{ left: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
```

### Acceptance Criteria
- [ ] Play/pause button toggles correctly
- [ ] Previous/next buttons work
- [ ] Progress bar updates in real-time (60fps)
- [ ] Seeking via progress bar works smoothly
- [ ] Time display shows MM:SS format
- [ ] Volume slider updates volume
- [ ] Now playing info displays current track
- [ ] Artwork thumbnail shows (if available)

### Visual Polish
- Smooth transitions on button states
- Progress bar handle enlarges on hover
- Disabled state for prev/next when at queue boundaries
- Loading state while track loads

### Definition of Done
- All controls functional
- UI updates smoothly without jank
- Keyboard shortcuts work (space for play/pause)
- Visual feedback on all interactions

---

## TICKET 2.4: Playback State Management
**Priority:** P1 (Core feature)  
**Estimate:** 5 hours

### Description
Centralized state management for playback across main and renderer processes. Sync state between AudioEngine, QueueManager, and UI.

### State Structure
```javascript
const PlaybackState = {
  currentTrack: null,        // Track object with metadata
  queue: [],                 // Array of track objects
  currentIndex: 0,           // Position in queue
  isPlaying: false,          // Play/pause state
  currentTime: 0,            // Playback position in seconds
  duration: 0,               // Track duration
  volume: 1.0,              // 0.0 to 1.0
  isMuted: false,           // Mute state
  isLoading: false          // Track loading state
};
```

### IPC Events for Playback

**Main → Renderer:**
- `playback:state-changed` - Full state update
- `playback:track-changed` - New track loaded
- `playback:time-update` - Current time (every 100ms)
- `playback:track-ended` - Track finished
- `playback:error` - Playback error

**Renderer → Main:**
- `playback:play` - Start playback
- `playback:pause` - Pause playback
- `playback:stop` - Stop playback
- `playback:seek` - Seek to position
- `playback:next` - Next track
- `playback:previous` - Previous track
- `playback:set-volume` - Change volume
- `playback:set-queue` - Load new queue
- `playback:play-track` - Play specific track from queue

### State Manager (Main Process)
```javascript
class PlaybackStateManager {
  constructor(audioEngine, queueManager) {
    this.audioEngine = audioEngine;
    this.queueManager = queueManager;
    this.state = { ...PlaybackState };
    this.timeUpdateInterval = null;
  }
  
  async playTrack(track) {
    this.state.isLoading = true;
    this.emitStateChange();
    
    try {
      await this.audioEngine.loadTrack(track.file_path);
      this.state.currentTrack = track;
      this.state.duration = track.duration_seconds;
      this.state.isLoading = false;
      this.audioEngine.play();
      this.state.isPlaying = true;
      this.startTimeUpdates();
      this.emitStateChange();
    } catch (error) {
      this.state.isLoading = false;
      this.emitError(error);
    }
  }
  
  pause() {
    this.audioEngine.pause();
    this.state.isPlaying = false;
    this.stopTimeUpdates();
    this.emitStateChange();
  }
  
  resume() {
    this.audioEngine.play();
    this.state.isPlaying = true;
    this.startTimeUpdates();
    this.emitStateChange();
  }
  
  seek(time) {
    this.audioEngine.seek(time);
    this.state.currentTime = time;
    this.emitStateChange();
  }
  
  async next() {
    const nextTrack = this.queueManager.next();
    if (nextTrack) {
      await this.playTrack(nextTrack);
    }
  }
  
  async previous() {
    // If >3 seconds into track, restart; else go to previous
    if (this.state.currentTime > 3) {
      this.seek(0);
    } else {
      const prevTrack = this.queueManager.previous();
      if (prevTrack) {
        await this.playTrack(prevTrack);
      }
    }
  }
  
  setVolume(value) {
    this.audioEngine.setVolume(value);
    this.state.volume = value;
    this.emitStateChange();
  }
  
  startTimeUpdates() {
    this.timeUpdateInterval = setInterval(() => {
      this.state.currentTime = this.audioEngine.getCurrentTime();
      this.emitTimeUpdate();
    }, 100); // 10 times per second
  }
  
  stopTimeUpdates() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  }
  
  emitStateChange() {
    // Send to all renderer windows
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('playback:state-changed', this.state);
    });
  }
  
  emitTimeUpdate() {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('playback:time-update', {
        currentTime: this.state.currentTime,
        duration: this.state.duration
      });
    });
  }
  
  emitError(error) {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('playback:error', error.message);
    });
  }
}
```

### Acceptance Criteria
- [ ] State syncs between main and renderer processes
- [ ] Time updates smoothly (no jank)
- [ ] State persists during track changes
- [ ] Volume changes apply immediately
- [ ] Queue updates reflect in UI
- [ ] Error states handled gracefully

### Performance Considerations
- Time updates: 100ms interval (10 fps) is smooth enough
- Debounce seek events during scrubbing
- Throttle state changes to avoid excessive IPC traffic

### Definition of Done
- All playback state accessible in renderer
- State changes propagate reliably
- No race conditions between processes
- Memory efficient (no leaks in intervals)

---

## TICKET 2.5: Double-Click to Play
**Priority:** P1 (Core feature)  
**Estimate:** 3 hours

### Description
Implement double-click to play functionality from library view. Clicking a track loads it and its context (album, playlist) into the queue and starts playback.

### Behavior

**From Library View (All Songs):**
- Double-click track → Play track
- Queue = all visible tracks in current sort order
- Current track = clicked track

**From Album View:**
- Double-click track → Play track
- Queue = all tracks in album
- Current track = clicked track

**From Playlist View:**
- Double-click track → Play track
- Queue = all tracks in playlist
- Current track = clicked track

### Implementation
```javascript
// In LibraryView component
function TrackRow({ track, onDoubleClick }) {
  return (
    <tr onDoubleClick={() => onDoubleClick(track)}>
      <td>{track.track_number}</td>
      <td>{track.title}</td>
      <td>{track.artist}</td>
      <td>{track.album}</td>
      <td>{formatDuration(track.duration_seconds)}</td>
    </tr>
  );
}

function LibraryView({ tracks }) {
  const handleTrackDoubleClick = async (track) => {
    // Get all tracks in current view
    const queue = tracks;
    const trackIndex = tracks.findIndex(t => t.track_id === track.track_id);
    
    // Send to main process
    await window.api.setQueue(queue);
    await window.api.playTrackAt(trackIndex);
  };
  
  return (
    <table>
      {tracks.map(track => (
        <TrackRow 
          key={track.track_id}
          track={track}
          onDoubleClick={handleTrackDoubleClick}
        />
      ))}
    </table>
  );
}
```

### Acceptance Criteria
- [ ] Double-click plays track immediately
- [ ] Queue loads correctly based on view context
- [ ] Playback starts within 500ms
- [ ] Previous playback stops cleanly
- [ ] Loading state shows during track load

### Edge Cases
- Double-clicking while another track playing (should switch)
- Double-clicking same track twice (restart)
- Empty queue handling
- Corrupted/missing audio file

### Definition of Done
- Double-click works in all views
- Queue context correct for each view
- Smooth transition between tracks
- Error handling for missing files

---

## TICKET 2.6: Keyboard Shortcuts
**Priority:** P2 (Nice to have)  
**Estimate:** 4 hours

### Description
Implement keyboard shortcuts for common playback actions.

### Keyboard Shortcuts

**Playback:**
- `Space` - Play/Pause
- `Cmd/Ctrl + Right` - Next track
- `Cmd/Ctrl + Left` - Previous track
- `Cmd/Ctrl + Up` - Volume up
- `Cmd/Ctrl + Down` - Volume down
- `Cmd/Ctrl + Shift + Down` - Mute/Unmute

**Navigation:**
- `Cmd/Ctrl + 1` - Library view
- `Cmd/Ctrl + 2` - Album view
- `Cmd/Ctrl + 3` - Playlists view

**Search:**
- `Cmd/Ctrl + F` - Focus search

### Implementation
```javascript
// Global keyboard handler
useEffect(() => {
  const handleKeyPress = (e) => {
    // Ignore if typing in input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    switch(e.key) {
      case ' ':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'ArrowRight':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          nextTrack();
        }
        break;
      case 'ArrowLeft':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          previousTrack();
        }
        break;
      // ... more shortcuts
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

### Acceptance Criteria
- [ ] All shortcuts work as expected
- [ ] Shortcuts don't interfere with text input
- [ ] Visual feedback on shortcut activation
- [ ] Works on both macOS and Windows
- [ ] Shortcuts listed in Help menu (future)

### Definition of Done
- Shortcuts documented in README
- Works reliably across OS
- No conflicts with system shortcuts

---

## TICKET 2.7: Volume Persistence
**Priority:** P2 (Nice to have)  
**Estimate:** 2 hours

### Description
Save and restore volume level across app sessions.

### Implementation
- Store volume in settings/preferences
- Load on app start
- Save on volume change (debounced)

### Acceptance Criteria
- [ ] Volume persists across restarts
- [ ] Mute state persists
- [ ] Default volume: 75% on first launch

### Definition of Done
- Volume setting saves reliably
- Loads on startup without audio glitch

---

## Phase 2 Summary

### Total Estimated Time: 34 hours (~1-2 weeks)

### Critical Path
1. Web Audio API Integration (2.1)
2. Queue Management (2.2)
3. Playback State Management (2.4)
4. Playback Controls UI (2.3)
5. Double-Click to Play (2.5)

### Deliverables
✅ Functional audio playback engine  
✅ Queue system with navigation  
✅ Playback controls UI  
✅ Centralized state management  
✅ Double-click to play  
✅ Keyboard shortcuts (optional)  
✅ Volume persistence (optional)  

### What's NOT in Phase 2
- EQ implementation (Phase 4)
- Gapless playback (V2)
- Shuffle mode (V2)
- Visual visualizer (V2)
- Crossfade (V2 - user doesn't want)

---

## Testing Checklist

### Playback Testing
- [ ] Play MP3 file
- [ ] Play FLAC file
- [ ] Play M4A file
- [ ] Pause and resume
- [ ] Seek to different positions
- [ ] Skip to next track
- [ ] Go to previous track
- [ ] Volume control (0-100%)
- [ ] Track ends naturally, auto-advances

### Queue Testing
- [ ] Add tracks to queue
- [ ] Remove tracks from queue
- [ ] Play from queue position
- [ ] Queue order maintained
- [ ] Empty queue handling

### UI Testing
- [ ] Progress bar updates smoothly
- [ ] Time display accurate
- [ ] Play/pause button state correct
- [ ] Disabled states on buttons
- [ ] Loading state shows

### Edge Cases
- [ ] Corrupted audio file
- [ ] Missing audio file
- [ ] Very long track (>1 hour)
- [ ] Very short track (<5 seconds)
- [ ] Rapid skip through tracks
- [ ] Seek to end of track
