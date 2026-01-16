# iTunes 11 Revival - Complete Project Plan

## Project Overview

**Goal:** Build a modern music library manager combining iTunes 11's superior information architecture with iTunes 12's visual design.

**Tech Stack:** Electron + React + SQLite  
**Platform:** macOS (primary)  
**Timeline:** 5-6 weeks of focused development  
**Status:** Planning Complete → Ready for Implementation

---

## Phase Breakdown

### Phase 1: Foundation (1.5-2 weeks, 50 hours)
**Focus:** Infrastructure, database, import, basic UI shell

**Deliverables:**
- ✅ Electron + React app setup
- ✅ Jest testing framework
- ✅ SQLite database with multi-genre support
- ✅ Music metadata extraction (MP3, FLAC, M4A)
- ✅ File import pipeline with progress tracking
- ✅ Three-panel UI layout (player bar top, sidebar, main content)
- ✅ IPC communication between processes
- ✅ Settings/preferences system

**Key Tickets:**
1. Project Setup & Dependencies (4h)
2. Testing Framework Setup (3h)
3. Database Schema Design (6h)
4. File System & Library Structure (3h)
5. Music Metadata Extraction (8h)
6. File Import Pipeline (10h)
7. Basic React UI Shell (8h)
8. Electron IPC Setup (4h)
9. Settings & Preferences (4h)

**What's NOT Included:**
- Playback functionality
- View implementations
- EQ
- Metadata editing

---

### Phase 2: Playback Core (1-2 weeks, 34 hours)
**Focus:** Audio engine, queue management, playback controls

**Deliverables:**
- ✅ Web Audio API integration
- ✅ Play/pause/stop/seek controls
- ✅ Queue management (next, previous, auto-advance)
- ✅ Playback state management
- ✅ PlayerBar UI with progress bar
- ✅ Double-click to play
- ✅ Keyboard shortcuts (space, arrows)
- ✅ Volume persistence

**Key Tickets:**
1. Web Audio API Integration (8h)
2. Playback Queue Management (6h)
3. Playback Controls UI (6h)
4. Playback State Management (5h)
5. Double-Click to Play (3h)
6. Keyboard Shortcuts (4h)
7. Volume Persistence (2h)

**What's NOT Included:**
- EQ (Phase 4)
- Gapless playback (V2)
- Shuffle (V2)
- Crossfade (V2)

---

### Phase 3: Views Implementation (1-2 weeks, 38 hours)
**Focus:** Library list, album gallery, playlist management

**Deliverables:**
- ✅ Sortable library view with virtual scrolling
- ✅ Album gallery grid
- ✅ Album detail view with blurred background
- ✅ Playlist creation, editing, deletion
- ✅ Drag-and-drop track reordering
- ✅ Custom playlist artwork
- ✅ View switching and navigation
- ✅ Search functionality (optional)

**Key Tickets:**
1. Library View - Sortable Track List (8h)
2. Album Gallery View (10h)
3. Playlist View & Management (10h)
4. View Switching & Navigation (4h)
5. Search & Filter (6h)

**What's NOT Included:**
- Smart playlists (V2)
- Advanced search filters (V2)
- Playlist folders (V2)

---

### Phase 4: Polish & Features (1-2 weeks, 34 hours)
**Focus:** EQ, metadata editing, search, visual polish

**Deliverables:**
- ✅ 10-band equalizer with presets
- ✅ Single track metadata editing
- ✅ Batch metadata editing
- ✅ Artwork management (add/replace/remove)
- ✅ Multi-genre tagging
- ✅ Advanced search with filters
- ✅ UI polish and animations
- ✅ Toast notifications
- ✅ Loading states
- ✅ Expanded keyboard shortcuts

**Key Tickets:**
1. 10-Band Equalizer Implementation (10h)
2. Metadata Editing (10h)
3. Advanced Search (5h)
4. UI Polish & Animations (6h)
5. Keyboard Shortcuts Expansion (3h)

**What's NOT Included:**
- Online metadata lookup (V2)
- Lyrics display (V2)
- Visualizer (V2)

---

### Phase 5: Edge Cases & Optimization (1-2 weeks, 33 hours)
**Focus:** Performance, error handling, production readiness

**Deliverables:**
- ✅ Optimized for 10k+ track libraries
- ✅ Comprehensive error handling
- ✅ Automatic database backups
- ✅ Schema migration system
- ✅ Edge case handling
- ✅ Memory leak prevention
- ✅ Logging system
- ✅ macOS app packaging (DMG)

**Key Tickets:**
1. Performance Optimization (8h)
2. Error Handling & Recovery (6h)
3. Database Backup & Migration (5h)
4. Edge Case Testing & Fixes (8h)
5. Packaging & Distribution (6h)

**Production Checklist:**
- Performance benchmarks met
- Error handling comprehensive
- Backups automatic
- Edge cases handled
- App packaged and tested

---

## Total Effort Estimate

| Phase | Hours | Weeks |
|-------|-------|-------|
| Phase 1: Foundation | 50 | 1.5-2 |
| Phase 2: Playback | 34 | 1-2 |
| Phase 3: Views | 38 | 1-2 |
| Phase 4: Polish | 34 | 1-2 |
| Phase 5: Production | 33 | 1-2 |
| **TOTAL** | **189** | **5-6** |

**Note:** Timeline assumes focused, uninterrupted development. Actual calendar time will vary based on availability.

---

## Feature Scope Summary

### V1 Features (What We're Building)

**Core Library Management:**
- Import music from folders (MP3, FLAC, M4A)
- Copy files to managed library
- Extract and store metadata
- Multi-genre tagging per track
- Album artist vs. track artist handling
- Compilation support

**Playback:**
- Play, pause, stop, seek
- Queue management
- Next/previous navigation
- Volume control
- 10-band EQ with presets

**Views:**
- Library: Sortable list of all tracks
- Album Gallery: Grid with blurred backgrounds
- Playlists: Custom playlists with artwork

**Metadata Editing:**
- Edit track info
- Batch editing
- Add/replace artwork
- Multi-genre support

**Search:**
- Global search across tracks
- Advanced filters (year, genre, etc.)

**Polish:**
- Keyboard shortcuts
- Smooth animations
- Toast notifications
- Loading states

### V2 Features (Future)

**Deferred to V2:**
- Gapless playback
- Play counts and statistics
- Shuffle mode
- Smart playlists
- CD ripping
- Lyrics display
- Import from streaming services
- Crossfade
- Repeat modes

**See v2-features.md for complete list**

---

## Key Technical Decisions

### Why Electron?
- Enables web tech (React, CSS, JS) in native app
- Faster development than native macOS
- User already knows web stack
- Cross-platform potential
- Accepts higher memory footprint

### Why SQLite?
- Fast, synchronous, local database
- No server needed
- Excellent for structured metadata
- Supports proper relational design

### Why Copy Files vs. Reference?
- More reliable (no broken links)
- Easier to manage
- Simpler backup strategy
- Storage is cheap
- Can add reference mode in V2

### Why 10-Band EQ?
- Industry standard
- Covers frequency spectrum well
- User specifically requested
- Web Audio API makes it straightforward

### Why No Smart Playlists in V1?
- Complex rules engine
- Adds significant scope
- Basic playlists cover 80% of use cases
- Can add in V2 based on real usage

---

## Success Criteria

### Performance
- Library with 10k tracks loads < 2 seconds
- Scrolling at 60fps smooth
- Search results < 200ms
- No memory leaks
- Playback starts < 500ms

### Quality
- >80% test coverage on core logic
- All supported formats play correctly
- Metadata editing works reliably
- UI feels polished and responsive
- Error handling prevents crashes

### User Experience
- Import workflow straightforward
- Playback controls intuitive
- View switching seamless
- Search fast and accurate
- Metadata editing comprehensive

---

## Development Workflow

### Getting Started
1. Read CLAUDE.md for full context
2. Set up development environment (Phase 1, Ticket 1.1)
3. Set up testing framework (Phase 1, Ticket 1.2)
4. Work through tickets in phase order

### Testing Strategy
- Write tests alongside code
- Test with real music files
- Use in-memory SQLite for unit tests
- Test edge cases early
- Performance test with large libraries

### Code Quality
- TypeScript optional but recommended
- ESLint for code consistency
- Prettier for formatting
- Document "why" not just "what"
- Handle errors gracefully

---

## Risk Mitigation

### Technical Risks

**Risk:** Web Audio API limitations  
**Mitigation:** Test all formats early, have fallback for unsupported codecs

**Risk:** Performance with large libraries  
**Mitigation:** Virtual scrolling, pagination, optimize queries early

**Risk:** Database corruption  
**Mitigation:** Automatic backups, migration system, transaction safety

**Risk:** Memory leaks  
**Mitigation:** Proper cleanup, testing with large libraries, profiling

### Scope Risks

**Risk:** Feature creep  
**Mitigation:** Strict V1/V2 separation, resist adding "just one more thing"

**Risk:** Perfectionism  
**Mitigation:** Ship V1, iterate based on real usage, gather feedback

**Risk:** Timeline slippage  
**Mitigation:** No hard deadline, track progress, adjust estimates

---

## After V1 Ships

### Immediate Next Steps
1. Use the app daily for 2-4 weeks
2. Note what's missing vs. what's annoying
3. Gather feedback (if sharing with others)
4. Prioritize V2 features based on actual pain points

### V2 Planning
- Review v2-features.md
- Re-prioritize based on real usage
- Don't build features that won't get used
- Focus on improvements that enhance daily workflow

### Potential Enhancements
- Gapless playback (if needed for live albums)
- Smart playlists (if rule-based playlists would be useful)
- Play stats (if want to track listening habits)
- CD ripping (if actually ripping CDs)

**Goal:** Tool that actually gets used daily, not a feature checklist.

---

## Documentation

### Available Documents
- **CLAUDE.md** - Complete context for AI assistance
- **phase-1-tickets.md** - Foundation implementation
- **phase-2-tickets.md** - Playback core
- **phase-3-tickets.md** - Views implementation
- **phase-4-tickets.md** - Polish and features
- **phase-5-tickets.md** - Production readiness
- **v2-features.md** - Future enhancements tracker

### User Documentation (To Create)
- README.md with setup instructions
- Keyboard shortcuts reference
- Troubleshooting guide
- Import best practices

---

## Next Steps

**Immediate:**
1. Review all phase documents
2. Set up development environment
3. Start Phase 1, Ticket 1.1
4. Read relevant SKILL.md files before each task

**Remember:**
- This is a personal tool - make it work for you
- Test with your actual music library
- Don't compromise on the details that matter
- Ship V1, then iterate

**Let's fucking build this.** 🤘
