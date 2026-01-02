# Phase 4: Polish & Features - Implementation Tickets

## Overview
Phase 4 adds the finishing touches: EQ, metadata editing, search, keyboard shortcuts, and visual refinements. This is where the app goes from functional to polished. Estimated 1-2 weeks of development time.

---

## TICKET 4.1: 10-Band Equalizer Implementation
**Priority:** P1 (Core feature - user requested)  
**Estimate:** 10 hours

### Description
Implement 10-band parametric equalizer using Web Audio API's BiquadFilterNode. Include presets and user-customizable settings.

### EQ Frequencies (Standard)
- 32 Hz (Sub-bass)
- 64 Hz (Bass)
- 125 Hz (Bass)
- 250 Hz (Low-mid)
- 500 Hz (Mid)
- 1 kHz (Mid)
- 2 kHz (Upper-mid)
- 4 kHz (Presence)
- 8 kHz (Brilliance)
- 16 kHz (Air)

### EQ Implementation
```javascript
class Equalizer {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.filters = [];
    this.frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    
    // Create 10 biquad filters
    this.frequencies.forEach(freq => {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.0; // Bandwidth
      filter.gain.value = 0; // dB (-12 to +12)
      this.filters.push(filter);
    });
    
    // Chain filters together
    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1]);
    }
  }
  
  getInputNode() {
    return this.filters[0];
  }
  
  getOutputNode() {
    return this.filters[this.filters.length - 1];
  }
  
  setBandGain(bandIndex, gainDB) {
    // Clamp gain between -12dB and +12dB
    const clampedGain = Math.max(-12, Math.min(12, gainDB));
    this.filters[bandIndex].gain.value = clampedGain;
  }
  
  getBandGain(bandIndex) {
    return this.filters[bandIndex].gain.value;
  }
  
  setPreset(preset) {
    preset.gains.forEach((gain, index) => {
      this.setBandGain(index, gain);
    });
  }
  
  reset() {
    this.filters.forEach(filter => {
      filter.gain.value = 0;
    });
  }
  
  getSettings() {
    return this.filters.map(filter => filter.gain.value);
  }
  
  loadSettings(settings) {
    settings.forEach((gain, index) => {
      this.setBandGain(index, gain);
    });
  }
}
```

### Audio Chain Integration
```javascript
// In AudioEngine class, modify play() method:
play() {
  this.sourceNode = this.audioContext.createBufferSource();
  this.sourceNode.buffer = this.currentTrack.buffer;
  
  // New chain: source → EQ input → EQ output → gain → analyser → destination
  this.sourceNode.connect(this.equalizer.getInputNode());
  this.equalizer.getOutputNode().connect(this.gainNode);
  this.gainNode.connect(this.analyserNode);
  this.analyserNode.connect(this.audioContext.destination);
  
  this.sourceNode.start(0, this.pauseTime);
  this.startTime = this.audioContext.currentTime - this.pauseTime;
  this.isPlaying = true;
}
```

### EQ Presets
```javascript
const EQ_PRESETS = {
  flat: {
    name: 'Flat',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  rock: {
    name: 'Rock',
    gains: [5, 3, -2, -3, -1, 1, 3, 4, 5, 5]
  },
  jazz: {
    name: 'Jazz',
    gains: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4]
  },
  classical: {
    name: 'Classical',
    gains: [5, 4, 3, 2, -1, -1, 0, 2, 3, 4]
  },
  pop: {
    name: 'Pop',
    gains: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2]
  },
  bassBoost: {
    name: 'Bass Boost',
    gains: [7, 6, 5, 3, 0, 0, 0, 0, 0, 0]
  },
  trebleBoost: {
    name: 'Treble Boost',
    gains: [0, 0, 0, 0, 0, 0, 3, 5, 6, 7]
  },
  vocal: {
    name: 'Vocal',
    gains: [-2, -3, -3, 1, 4, 4, 3, 1, 0, -1]
  },
  electronic: {
    name: 'Electronic',
    gains: [5, 4, 2, 0, -2, 2, 1, 2, 4, 5]
  },
  acoustic: {
    name: 'Acoustic',
    gains: [5, 3, 2, 1, 2, 2, 3, 3, 4, 3]
  }
};
```

### EQ UI Component
```jsx
function EqualizerPanel({ isOpen, onClose }) {
  const [bandGains, setBandGains] = useState(Array(10).fill(0));
  const [selectedPreset, setSelectedPreset] = useState('flat');
  
  const frequencies = [32, 64, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'];
  
  const handleBandChange = async (bandIndex, value) => {
    const newGains = [...bandGains];
    newGains[bandIndex] = value;
    setBandGains(newGains);
    await window.api.setEQBand(bandIndex, value);
  };
  
  const handlePresetSelect = async (presetName) => {
    const preset = EQ_PRESETS[presetName];
    setBandGains(preset.gains);
    setSelectedPreset(presetName);
    await window.api.setEQPreset(presetName);
  };
  
  const handleReset = async () => {
    const flatGains = Array(10).fill(0);
    setBandGains(flatGains);
    setSelectedPreset('flat');
    await window.api.resetEQ();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="equalizer-panel">
      <div className="eq-header">
        <h3>Equalizer</h3>
        <button onClick={onClose}>✕</button>
      </div>
      
      <div className="eq-presets">
        <select 
          value={selectedPreset} 
          onChange={(e) => handlePresetSelect(e.target.value)}
        >
          {Object.keys(EQ_PRESETS).map(key => (
            <option key={key} value={key}>
              {EQ_PRESETS[key].name}
            </option>
          ))}
        </select>
        <button onClick={handleReset}>Reset</button>
      </div>
      
      <div className="eq-sliders">
        {frequencies.map((freq, index) => (
          <div key={index} className="eq-band">
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={bandGains[index]}
              onChange={(e) => handleBandChange(index, parseFloat(e.target.value))}
              orient="vertical"
            />
            <div className="gain-value">{bandGains[index] > 0 ? '+' : ''}{bandGains[index]}dB</div>
            <div className="frequency-label">{freq}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### EQ Button in PlayerBar
```jsx
// Add EQ button next to volume control
<button 
  className="eq-button"
  onClick={() => setEQPanelOpen(!eqPanelOpen)}
  title="Equalizer"
>
  ≋
</button>
```

### CSS for EQ Sliders
```css
.eq-sliders {
  display: flex;
  justify-content: space-around;
  padding: 20px;
  background: #252525;
  border-radius: 8px;
}

.eq-band {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.eq-band input[type="range"] {
  writing-mode: bt-lr; /* IE */
  -webkit-appearance: slider-vertical;
  width: 8px;
  height: 150px;
  padding: 0;
}

.frequency-label {
  font-size: 11px;
  color: #a0a0a0;
}

.gain-value {
  font-size: 12px;
  color: #ffffff;
  min-width: 45px;
  text-align: center;
}
```

### Acceptance Criteria
- [ ] 10 frequency bands adjustable
- [ ] Gain range: -12dB to +12dB
- [ ] Preset selection works
- [ ] Custom settings saved per session
- [ ] EQ applies to all playback
- [ ] Visual feedback on sliders
- [ ] Reset to flat works
- [ ] No audio artifacts or distortion

### Performance Notes
- EQ adds minimal CPU overhead
- All filter changes apply in real-time
- No audible latency

### Definition of Done
- EQ functional with all bands
- Presets work correctly
- Settings persist during session
- UI polished and usable
- No audio quality degradation

---

## TICKET 4.2: Metadata Editing
**Priority:** P1 (Core feature)  
**Estimate:** 10 hours

### Description
Implement comprehensive metadata editing with support for single-track and batch editing.

### Editable Fields
- Title
- Artist
- Album
- Album Artist
- Track Number
- Disc Number
- Genres (multiple)
- Year
- Compilation flag
- Album Artwork

### Track Info Dialog
```jsx
function TrackInfoDialog({ track, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: track.title,
    artist: track.artist,
    album: track.album,
    albumArtist: track.album_artist,
    trackNumber: track.track_number,
    discNumber: track.disc_number,
    genres: [], // Load from track_genres
    year: track.release_year,
    isCompilation: track.is_compilation
  });
  
  const [artwork, setArtwork] = useState(null);
  const [genres, setGenres] = useState([]);
  
  useEffect(() => {
    loadTrackGenres();
  }, []);
  
  const loadTrackGenres = async () => {
    const trackGenres = await window.api.getTrackGenres(track.track_id);
    setGenres(trackGenres);
  };
  
  const handleSave = async () => {
    await window.api.updateTrack(track.track_id, formData);
    
    if (artwork) {
      await window.api.updateTrackArtwork(track.track_id, artwork);
    }
    
    onSave();
    onClose();
  };
  
  const handleArtworkSelect = async () => {
    const artworkPath = await window.api.selectArtworkFile();
    if (artworkPath) {
      setArtwork(artworkPath);
    }
  };
  
  return (
    <div className="dialog-overlay">
      <div className="track-info-dialog">
        <div className="dialog-header">
          <h2>Track Info</h2>
          <button onClick={onClose}>✕</button>
        </div>
        
        <div className="dialog-tabs">
          <button className="active">Details</button>
          <button>Artwork</button>
          <button>File</button>
        </div>
        
        <div className="dialog-content">
          {/* Details Tab */}
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Artist</label>
            <input
              type="text"
              value={formData.artist}
              onChange={(e) => setFormData({...formData, artist: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Album</label>
            <input
              type="text"
              value={formData.album}
              onChange={(e) => setFormData({...formData, album: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Album Artist</label>
            <input
              type="text"
              value={formData.albumArtist}
              onChange={(e) => setFormData({...formData, albumArtist: e.target.value})}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Track #</label>
              <input
                type="number"
                value={formData.trackNumber}
                onChange={(e) => setFormData({...formData, trackNumber: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Disc #</label>
              <input
                type="number"
                value={formData.discNumber}
                onChange={(e) => setFormData({...formData, discNumber: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({...formData, year: e.target.value})}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Genres</label>
            <GenreSelector
              selectedGenres={genres}
              onChange={setGenres}
            />
          </div>
          
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isCompilation}
                onChange={(e) => setFormData({...formData, isCompilation: e.target.checked})}
              />
              Part of a compilation
            </label>
          </div>
        </div>
        
        <div className="dialog-buttons">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave} className="primary">Save</button>
        </div>
      </div>
    </div>
  );
}
```

### Genre Selector Component
```jsx
function GenreSelector({ selectedGenres, onChange }) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  const handleAddGenre = (genre) => {
    if (!selectedGenres.includes(genre)) {
      onChange([...selectedGenres, genre]);
    }
    setInput('');
  };
  
  const handleRemoveGenre = (genre) => {
    onChange(selectedGenres.filter(g => g !== genre));
  };
  
  const handleInputChange = async (value) => {
    setInput(value);
    if (value.length > 0) {
      const genreSuggestions = await window.api.searchGenres(value);
      setSuggestions(genreSuggestions);
    } else {
      setSuggestions([]);
    }
  };
  
  return (
    <div className="genre-selector">
      <div className="selected-genres">
        {selectedGenres.map(genre => (
          <span key={genre} className="genre-tag">
            {genre}
            <button onClick={() => handleRemoveGenre(genre)}>✕</button>
          </span>
        ))}
      </div>
      
      <div className="genre-input">
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              handleAddGenre(input.trim());
            }
          }}
          placeholder="Add genre..."
        />
        
        {suggestions.length > 0 && (
          <div className="genre-suggestions">
            {suggestions.map(genre => (
              <div 
                key={genre}
                onClick={() => handleAddGenre(genre)}
                className="suggestion"
              >
                {genre}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Batch Edit Multiple Tracks
```jsx
function BatchEditDialog({ trackIds, onClose, onSave }) {
  const [formData, setFormData] = useState({
    album: '',
    albumArtist: '',
    year: '',
    genres: [],
    // Only show fields that make sense for batch edit
  });
  
  const [fieldsToUpdate, setFieldsToUpdate] = useState(new Set());
  
  const handleFieldEnable = (field) => {
    const newFields = new Set(fieldsToUpdate);
    if (newFields.has(field)) {
      newFields.delete(field);
    } else {
      newFields.add(field);
    }
    setFieldsToUpdate(newFields);
  };
  
  const handleSave = async () => {
    // Only update fields that are enabled
    const updates = {};
    fieldsToUpdate.forEach(field => {
      updates[field] = formData[field];
    });
    
    await window.api.batchUpdateTracks(trackIds, updates);
    onSave();
    onClose();
  };
  
  return (
    <div className="batch-edit-dialog">
      <div className="dialog-header">
        <h2>Edit {trackIds.length} Items</h2>
      </div>
      
      <div className="batch-edit-fields">
        <div className="field-row">
          <input
            type="checkbox"
            checked={fieldsToUpdate.has('album')}
            onChange={() => handleFieldEnable('album')}
          />
          <label>Album</label>
          <input
            type="text"
            disabled={!fieldsToUpdate.has('album')}
            value={formData.album}
            onChange={(e) => setFormData({...formData, album: e.target.value})}
          />
        </div>
        
        {/* Similar for other batch-editable fields */}
      </div>
      
      <div className="dialog-buttons">
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSave}>Update {trackIds.length} Items</button>
      </div>
    </div>
  );
}
```

### Artwork Tab
```jsx
function ArtworkTab({ track, artwork, onArtworkChange }) {
  return (
    <div className="artwork-tab">
      <div className="current-artwork">
        {artwork || track.artwork_path ? (
          <img src={`file://${artwork || track.artwork_path}`} />
        ) : (
          <div className="no-artwork">No Artwork</div>
        )}
      </div>
      
      <div className="artwork-actions">
        <button onClick={onArtworkChange}>Add Artwork...</button>
        <button onClick={() => onArtworkChange(null)}>Remove Artwork</button>
        <button onClick={() => searchOnlineArtwork(track)}>Search Online...</button>
      </div>
      
      <div className="artwork-info">
        Drag and drop an image file here
      </div>
    </div>
  );
}
```

### File Info Tab (Read-only)
```jsx
function FileInfoTab({ track }) {
  return (
    <div className="file-info-tab">
      <table>
        <tbody>
          <tr>
            <td>File Path:</td>
            <td>{track.file_path}</td>
          </tr>
          <tr>
            <td>Format:</td>
            <td>{track.codec?.toUpperCase()}</td>
          </tr>
          <tr>
            <td>Bitrate:</td>
            <td>{track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : 'N/A'}</td>
          </tr>
          <tr>
            <td>Sample Rate:</td>
            <td>{track.sample_rate ? `${track.sample_rate / 1000} kHz` : 'N/A'}</td>
          </tr>
          <tr>
            <td>File Size:</td>
            <td>{formatFileSize(track.file_size_bytes)}</td>
          </tr>
          <tr>
            <td>Duration:</td>
            <td>{formatDuration(track.duration_seconds)}</td>
          </tr>
          <tr>
            <td>Date Added:</td>
            <td>{new Date(track.date_added).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

### Acceptance Criteria
- [ ] Edit single track metadata
- [ ] Batch edit multiple tracks
- [ ] Genre multi-select with autocomplete
- [ ] Add/replace/remove artwork
- [ ] Changes save to database
- [ ] Album cache updates
- [ ] UI updates immediately after save
- [ ] Validation on required fields

### Definition of Done
- Metadata editing fully functional
- Batch editing works correctly
- Artwork management complete
- Changes persist and display

---

## TICKET 4.3: Advanced Search
**Priority:** P2 (Nice to have)  
**Estimate:** 5 hours

### Description
Enhanced search with filters and advanced query options.

### Search Filters
- Text search (title, artist, album, genre)
- Year range
- Duration range
- Genre filter (multi-select)
- Compilation filter

### Advanced Search UI
```jsx
function AdvancedSearch({ onClose, onSearch }) {
  const [filters, setFilters] = useState({
    text: '',
    yearMin: '',
    yearMax: '',
    durationMin: '',
    durationMax: '',
    genres: [],
    compilationsOnly: false
  });
  
  const handleSearch = async () => {
    const results = await window.api.advancedSearch(filters);
    onSearch(results);
    onClose();
  };
  
  return (
    <div className="advanced-search-panel">
      <h3>Advanced Search</h3>
      
      <div className="search-field">
        <label>Search for:</label>
        <input
          type="text"
          value={filters.text}
          onChange={(e) => setFilters({...filters, text: e.target.value})}
          placeholder="Title, artist, album..."
        />
      </div>
      
      <div className="search-field">
        <label>Year:</label>
        <div className="range-inputs">
          <input
            type="number"
            placeholder="From"
            value={filters.yearMin}
            onChange={(e) => setFilters({...filters, yearMin: e.target.value})}
          />
          <span>to</span>
          <input
            type="number"
            placeholder="To"
            value={filters.yearMax}
            onChange={(e) => setFilters({...filters, yearMax: e.target.value})}
          />
        </div>
      </div>
      
      <div className="search-field">
        <label>Genres:</label>
        <GenreMultiSelect
          selectedGenres={filters.genres}
          onChange={(genres) => setFilters({...filters, genres})}
        />
      </div>
      
      <div className="search-field">
        <label>
          <input
            type="checkbox"
            checked={filters.compilationsOnly}
            onChange={(e) => setFilters({...filters, compilationsOnly: e.target.checked})}
          />
          Compilations only
        </label>
      </div>
      
      <div className="search-buttons">
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSearch} className="primary">Search</button>
      </div>
    </div>
  );
}
```

### Database Query Builder
```javascript
function buildAdvancedSearchQuery(filters) {
  let query = 'SELECT DISTINCT t.* FROM tracks t';
  let joins = [];
  let conditions = [];
  let params = [];
  
  if (filters.text) {
    joins.push('JOIN tracks_fts fts ON t.track_id = fts.rowid');
    conditions.push('tracks_fts MATCH ?');
    params.push(filters.text);
  }
  
  if (filters.genres.length > 0) {
    joins.push('JOIN track_genres tg ON t.track_id = tg.track_id');
    joins.push('JOIN genres g ON tg.genre_id = g.genre_id');
    conditions.push(`g.name IN (${filters.genres.map(() => '?').join(',')})`);
    params.push(...filters.genres);
  }
  
  if (filters.yearMin) {
    conditions.push('t.release_year >= ?');
    params.push(filters.yearMin);
  }
  
  if (filters.yearMax) {
    conditions.push('t.release_year <= ?');
    params.push(filters.yearMax);
  }
  
  if (filters.compilationsOnly) {
    conditions.push('t.is_compilation = 1');
  }
  
  if (joins.length > 0) {
    query += ' ' + joins.join(' ');
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY t.artist, t.album, t.track_number';
  
  return { query, params };
}
```

### Acceptance Criteria
- [ ] Text search with filters
- [ ] Year range filtering
- [ ] Genre multi-select
- [ ] Compilation filter
- [ ] Save search (optional)
- [ ] Fast results (<200ms)

### Definition of Done
- Advanced search functional
- All filters work correctly
- Query performance acceptable

---

## TICKET 4.4: UI Polish & Animations
**Priority:** P2 (Nice to have)  
**Estimate:** 6 hours

### Description
Visual refinements, smooth transitions, loading states, and micro-interactions.

### Animations to Add
- View transitions (fade in/out)
- Button hover states
- Progress bar smooth updates
- Modal/dialog slide-in
- Toast notifications
- Loading spinners
- Skeleton screens for loading

### CSS Transitions
```css
/* View transitions */
.view-enter {
  opacity: 0;
  transform: translateY(10px);
}

.view-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms, transform 200ms;
}

.view-exit {
  opacity: 1;
}

.view-exit-active {
  opacity: 0;
  transition: opacity 150ms;
}

/* Button hover */
button {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

button:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Progress bar smooth fill */
.progress-fill {
  transition: width 100ms linear;
}

/* Modal slide-in */
.modal-enter {
  opacity: 0;
  transform: scale(0.95);
}

.modal-enter-active {
  opacity: 1;
  transform: scale(1);
  transition: opacity 200ms, transform 200ms;
}
```

### Loading States
```jsx
function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <div className="loading-message">{message}</div>
    </div>
  );
}

function SkeletonTrackRow() {
  return (
    <div className="skeleton-track-row">
      <div className="skeleton skeleton-text" style={{ width: '30%' }} />
      <div className="skeleton skeleton-text" style={{ width: '20%' }} />
      <div className="skeleton skeleton-text" style={{ width: '25%' }} />
      <div className="skeleton skeleton-text" style={{ width: '10%' }} />
    </div>
  );
}
```

### Toast Notifications
```jsx
function ToastNotification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button onClick={onClose}>✕</button>
    </div>
  );
}

// Usage
showToast('Track added to playlist', 'success');
showToast('Failed to load track', 'error');
```

### Acceptance Criteria
- [ ] Smooth view transitions
- [ ] Loading states for async operations
- [ ] Toast notifications for user actions
- [ ] Hover states on interactive elements
- [ ] Focus states for accessibility
- [ ] Smooth progress bar updates

### Definition of Done
- UI feels polished and responsive
- Animations smooth (60fps)
- Loading states prevent confusion

---

## TICKET 4.5: Keyboard Shortcuts Expansion
**Priority:** P2 (Nice to have)  
**Estimate:** 3 hours

### Description
Additional keyboard shortcuts beyond basic playback controls.

### Additional Shortcuts
- `Cmd/Ctrl + N` - New playlist
- `Cmd/Ctrl + I` - Get info on selected track(s)
- `Cmd/Ctrl + A` - Select all
- `Delete/Backspace` - Remove from playlist
- `Enter` - Play selected track
- `/` - Focus search
- `Esc` - Close dialog/panel

### Definition of Done
- All shortcuts documented
- Shortcuts work reliably
- No conflicts

---

## Phase 4 Summary

### Total Estimated Time: 34 hours (~1-2 weeks)

### Critical Path
1. 10-Band EQ (4.1)
2. Metadata Editing (4.2)

### Deliverables
✅ Functional 10-band equalizer with presets  
✅ Single and batch metadata editing  
✅ Advanced search with filters  
✅ UI polish and smooth animations  
✅ Comprehensive keyboard shortcuts  
✅ Toast notifications  
✅ Loading states  

### What's NOT in Phase 4
- Online metadata lookup (V2)
- Lyrics display (V2)
- Visualizer (V2)

---

## Testing Checklist

### EQ Testing
- [ ] All 10 bands adjustable
- [ ] Presets apply correctly
- [ ] No audio artifacts
- [ ] Settings persist

### Metadata Editing
- [ ] Single track edit saves
- [ ] Batch edit works
- [ ] Genres multi-select
- [ ] Artwork add/replace/remove
- [ ] Compilation flag works

### Polish Testing
- [ ] Smooth animations
- [ ] Loading states show
- [ ] Toast notifications appear
- [ ] Keyboard shortcuts work
