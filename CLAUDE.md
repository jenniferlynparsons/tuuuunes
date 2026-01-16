# CLAUDE.md - AI Development Context

## Project Overview

**Project Name:** iTunes 11 Revival (working title)  
**Type:** Desktop music library and player application  
**Tech Stack:** Electron + React + SQLite  
**Platform:** macOS (primary), potential cross-platform later  
**Status:** Phase 1 - Foundation (In Planning)

### What We're Building
A modern music library manager that combines iTunes 11's superior information architecture with iTunes 12's cleaner visual design. This is a personal tool built for someone with a large, well-curated music collection who wants control, flexibility, and a beautiful listening experience.

### What We're NOT Building
- Streaming service integration
- Social features or sharing
- Music store/purchasing
- Cloud sync
- Mobile apps
- Device (iPhone/iPod) syncing

---

## Design Philosophy

### iTunes 11's Architecture (What We're Keeping)
- Clear, hierarchical navigation: Library → Music → Views (Songs, Albums, Artists)
- Smart view switching: List view for sortable tracks, gallery for visual browsing
- Intuitive information organization
- Straightforward user mental models

### iTunes 12's Aesthetics (What We're Adopting)
- Clean, modern dark theme
- Refined visual hierarchy
- Better use of white space
- Polished UI components
- System-native look and feel

### Core Principles
1. **Managed Library:** Copy files into organized structure (no file reference mode in V1)
2. **Metadata First:** Rich, editable metadata with multi-genre support
3. **Album Art Everywhere:** Visual browsing with that gorgeous blurred background effect
4. **No Bullshit:** Clean, focused feature set - do fewer things really well
5. **Compilation-Friendly:** Proper album artist vs. track artist handling

---

## Technical Architecture

### Stack Decisions & Rationale

**Electron**
- Enables web tech (HTML/CSS/JS) in native app wrapper
- Developer already knows web stack from Flask work
- Faster development than learning native macOS (Swift/AppKit)
- Cross-platform potential if needed later
- Yes, it's heavier than native - we accept this tradeoff

**React**
- Component-based UI matches desktop app patterns
- Developer has frontend design background
- Rich ecosystem for UI components
- Good state management options

**SQLite (better-sqlite3)**
- Fast, synchronous database perfect for local app
- No server needed
- Single file storage
- Excellent for structured music metadata
- Supports proper relational design (junction tables for genres)

**music-metadata (npm)**
- Handles MP3, FLAC, M4A metadata extraction
- Extracts embedded artwork
- Actively maintained
- Supports all major tag formats (ID3v2, Vorbis, MP4)

### File System Structure
```
~/Music/YourAppName/
├── Music/                    # Managed music library
│   ├── Artist Name/
│   │   └── Album Name/
│   │       ├── 01 Track.flac
│   │       └── 02 Track.flac
├── Artwork/                  # Cached artwork
│   ├── albums/
│   │   └── [hash].jpg
│   └── playlists/
│       └── [hash].jpg
└── Database/
    └── library.db           # SQLite database
```

### Database Schema Highlights

**Multi-Genre Support:**
Uses proper junction table (track_genres) to enable multiple genres per track - something iTunes never did right.

**Album Artist Handling:**
Separate `artist` and `album_artist` fields on tracks table. Critical for compilations and "Various Artists" albums.

**Compilation Flag:**
Boolean field to identify compilation albums, affects grouping in album view.

**Date Tracking:**
- `release_year`: From metadata (original release)
- `date_added`: When imported to library
- This distinction matters for long-time music collectors

---

## Feature Scope

### V1 Features (MVP)

**Core Library Management:**
- Import music from folders (recursive scan)
- Copy files to managed library location
- Extract and store metadata
- Support MP3, FLAC, M4A formats
- Handle embedded album artwork
- Multi-genre tagging per track

**Metadata Editing:**
- Edit track info (title, artist, album, album artist, genres, year)
- Add/replace album artwork
- Batch editing for multiple tracks
- Custom playlist artwork

**Three Main Views:**
1. **Library View:** Sortable list of all tracks
2. **Album Gallery:** Grid of albums with artwork, blurred background on selection
3. **Playlist View:** Custom playlists with artwork support

**Playback:**
- Basic controls (play, pause, skip, volume)
- Queue management
- Now playing display
- 10-band EQ with presets

**Compilation Handling:**
- Album artist vs. track artist display logic
- "Various Artists" grouping
- Proper compilation album organization

### V2 Features (Future Phases)

**Playback Enhancements:**
- Gapless playback (important for live albums, DJ mixes)
- Shuffle mode
- Play counts and listening statistics
- Last played tracking
- Skip count (for smart playlists later)

**Advanced Features:**
- Smart playlists (rule-based)
- CD ripping (bucket list item)
- Lyrics display
- Import playlists from streaming services

**Maybe Later:**
- Crossfade (marked as "useless" by user, low priority)
- Repeat modes
- Star ratings (user doesn't use these)
- Comments field (user doesn't use this)

---

## User Context & Preferences

### Who This Is For
**Primary User:** Neurodivergent (ADHD + autistic) woman who:
- Works as engineering manager (tech leadership background)
- Runs a sci-fi/fantasy magazine (editorial experience)
- Has decade of print design experience
- Values both technical precision and creative expression
- Maintains large, curated music collection
- Appreciates DIY ethic and building own tools

### Communication Style Preferences
- Complete drafts over incremental iterations
- Bullet points for complex information
- Substance with appropriate humor
- Direct feedback encouraged
- Deep dives until natural stopping point
- Separate conversations for different projects

### Music Collection Characteristics
- Large library (1000+ tracks likely)
- Many compilations (requires good album artist handling)
- Cares about proper metadata
- Values album artwork highly
- Uses playlists actively
- Multiple genres per track common

### Why iTunes 11/12 Hybrid?
- iTunes 11 had best information architecture Apple ever shipped
- iTunes 12 looked better but buried functionality
- Post-12, Apple Music integration ruined the experience
- Modern macOS Music.app is terrible for local library management
- User wants control over their music library
- DIY ethic: "build what doesn't exist"

---

## Development Approach

### Phase Structure
**Phase 1:** Foundation (database, import, UI shell) - 1-2 weeks  
**Phase 2:** Playback core (audio engine, controls, queue) - 1-2 weeks  
**Phase 3:** Views implementation (library, gallery, playlists) - 1-2 weeks  
**Phase 4:** Polish (EQ, metadata editing, search, keyboard shortcuts) - 1-2 weeks  
**Phase 5:** Edge cases and optimization - 1-2 weeks

Total V1 estimate: 5-6 weeks of focused development time.

**Timeline Note:** No hard deadline. "Work on it when I have time" project.

### Testing Philosophy
- Test with real music files from user's library
- Handle edge cases gracefully (missing metadata, corrupt files)
- Performance matters (large libraries of 10,000+ tracks)
- Cross-format testing (MP3, FLAC, M4A)
- Unicode and special character handling
- **Write tests early** - Set up testing infrastructure in Phase 1
- Target >80% code coverage for critical paths
- Use TDD for complex logic (database, metadata, import pipeline)
- Mock external dependencies (file system, Electron APIs)
- Tests should run fast (<30 seconds total for full suite)

### Code Quality Standards
- Write it like you're handing it off to a team
- Document why, not just what
- Handle errors gracefully, don't crash
- Performance acceptable for large libraries
- Use transactions for database operations

---

## Technical Decisions & Rationale

### Why Copy Files vs. Reference?
**Decision:** V1 implements copy-to-managed-library only.

**Reasoning:**
- More reliable (no broken links if user moves files)
- Easier to manage (one canonical location)
- Simpler backup strategy
- Better for edge cases (external drives, network shares)
- User preference: "make it bulletproof"
- Storage is cheap, broken links are annoying

Power user "reference mode" pushed to V2.

### Why No Smart Playlists in V1?
Complex rules engine adds significant scope. Basic playlists cover 80% of use cases. V2 feature.

### Why No CD Ripping/Burning?
- Ripping: Technically possible but complex (needs libcdio integration)
- Burning: Even more complex, platform-specific APIs
- Both: Most users use separate tools or don't need it
- User marked as "bucket list" not critical path
- Can always add later if actively needed

### Why Include EQ in V1?
User specifically called it "important." Web Audio API makes it straightforward (BiquadFilterNode). Not trivial but achievable. Elevates from "yet another player" to "my player."

### Why 10-Band EQ?
Industry standard. Covers frequency spectrum well:
32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz

More bands = diminishing returns. Fewer bands = not enough control.

---

## Database Design Notes

### Junction Tables Strategy
Used for many-to-many relationships:
- `track_genres`: One track can have multiple genres
- `playlist_tracks`: One playlist contains many tracks, one track can be in many playlists

Includes position/order field in `playlist_tracks` for custom ordering.

### Indexing Strategy
Indexes on commonly queried fields:
- `tracks.album`, `tracks.artist`, `tracks.album_artist` (browsing)
- `tracks.date_added` (recent additions)
- `genres.name` (genre filtering)
- Foreign keys (join performance)

Verified with `EXPLAIN QUERY PLAN` during testing.

### Timestamp Strategy
Unix timestamps (seconds since epoch) for:
- `date_added`
- `created_at`
- `updated_at`
- `last_played` (V2)

Easier to work with in JavaScript, sortable, timezone-agnostic.

### Artwork Storage
Store paths to cached files, not blobs in database. Why:
- Better performance (database stays smaller)
- Easier to manage/backup artwork separately
- Can resize artwork without touching database
- Simpler file serving to UI

Use content-based hashing for filenames to deduplicate automatically.

---

## UI/UX Design Notes

### Layout Inspiration
```
┌─────────────────────────────────────────────────┐
│ Player Bar (80px fixed, top)                    │
│ [Play] [Pause] [Skip] ━━━━●━━━━ 2:34 / 4:12    │
│ Now Playing: Track Name - Artist Name           │
├─────────────────────────────────────────────────┤
│ Sidebar         │ Main Content Area             │
│ (200px)         │ (flexible)                     │
│                 │                                │
│ LIBRARY         │                                │
│ • Music         │   Active View:                 │
│ • Playlists     │   - Library (sortable list)    │
│                 │   - Album Gallery (grid)       │
│ PLAYLISTS       │   - Playlist (custom)          │
│ • Favorites     │                                │
│ • Running       │                                │
│ • Chill         │                                │
│                 │                                │
└─────────────────────────────────────────────────┘
```

### Visual Theme (iTunes 12 Dark)
- Background: `#1e1e1e` (main content)
- Sidebar: `#252525` (slightly lighter)
- Text: `#ffffff` (primary), `#a0a0a0` (secondary)
- Accent: `#0a84ff` (Apple blue)
- Borders: `#3a3a3a`
- Font: System UI font (San Francisco on macOS)

### Album Gallery - Blurred Background Effect
When user clicks album in gallery view:
1. Show album detail overlay
2. Use album artwork as background
3. Apply CSS `backdrop-filter: blur(40px)` or canvas blur
4. Darken/desaturate for readability
5. Display track list, album info over blurred art

This is the signature visual feature that makes the app feel polished.

### Metadata Editing UI
Modal or sidebar panel with tabs:
- **Details:** Title, artist, album, album artist, track #, disc #, year
- **Genres:** Multi-select tag input (can add multiple)
- **Artwork:** Drag-drop image, preview, remove option
- **File Info:** Codec, bitrate, sample rate, file size (read-only)

Batch editing: Select multiple tracks → right-click → "Edit Multiple Items"  
Only show fields that make sense to batch edit (album, album artist, genres, year).

---

## Common Pitfalls & Solutions

### Problem: Large Import Hangs UI
**Solution:** Run import in main process, send progress events to renderer. Keep UI responsive.

### Problem: Duplicate Files
**Solution:** Check `file_path` uniqueness before insert. V1: Skip duplicates. V2: Audio fingerprinting for true deduplication.

### Problem: Missing Metadata
**Solution:** Graceful fallbacks:
- Title → Filename
- Artist → "Unknown Artist"
- Album → "Unknown Album"
- Let user edit later

### Problem: Corrupt Audio Files
**Solution:** Try-catch around metadata extraction. Log error, skip file, continue import. Don't crash entire import.

### Problem: Huge Artwork Files
**Solution:** Resize embedded artwork if >1MB before caching. Use sharp or jimp library.

### Problem: Unicode Filenames
**Solution:** Use Node's native UTF-8 support. Test with actual international characters. Sanitize for filesystem (remove/replace invalid chars).

### Problem: Album Artist vs. Artist Confusion
**Solution:** 
- Display album artist in album view grouping
- Display track artist in song lists
- When both are same, show once
- Compilations: Use "Various Artists" as album artist

---

## Key Dependencies

### Production
```json
{
  "electron": "^28.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "better-sqlite3": "^9.0.0",
  "music-metadata": "^8.1.0",
  "electron-store": "^8.0.0"
}
```

### Development
```json
{
  "electron-builder": "^24.0.0",
  "webpack": "^5.0.0", // or Vite
  "jest": "^29.0.0",
  "@testing-library/react": "^14.0.0",
  "@testing-library/user-event": "^14.0.0",
  "mock-fs": "^5.0.0"
}
```

### Future Additions (as needed)
- `sharp` or `jimp`: Image resizing for artwork
- `fluent-ffmpeg`: Audio transcoding if needed
- `fuse.js`: Fuzzy search for library
- `react-window`: Virtual scrolling for huge libraries

---

## Conversation History & Context

### Key Decisions Made
1. Copy files to managed library (not reference)
2. Multi-genre support via junction table
3. EQ included in V1 (user priority)
4. No smart playlists in V1
5. Skip CD ripping/burning for now
6. iTunes 11 architecture + iTunes 12 visuals
7. Shuffle is nice-to-have for V1, not critical
8. No ratings, no comments (user doesn't use)
9. Play counts pushed to V2

### User's Priorities
**Must-Have:**
- Metadata editing with batch support
- Album artwork everywhere
- Multi-genre tagging
- Proper compilation handling
- EQ functionality

**Nice-to-Have:**
- Shuffle mode
- Gapless playback (moved to V2)

**Don't Care:**
- Ratings
- Comments
- Crossfade
- Repeat modes

### Design Aesthetic Goals
"Match iTunes 12 styling" = dark theme, clean, refined  
"Use iTunes 11 architecture" = clear navigation, smart view switching

The blurred album artwork background is a signature visual feature that user specifically called out as important.

---

## Working with This Project (For AI Assistants)

### Communication Style
- Provide complete drafts, not incremental suggestions
- Use bullet points for complex information
- Be direct and substantive
- Include code examples when relevant
- Don't over-format with excessive bold/headers in conversational responses

### When Giving Technical Advice
- Explain rationale, not just "what"
- Consider user's existing knowledge (web dev, design, engineering management)
- Assume user can implement but needs architectural guidance
- Balance "perfect" vs. "ship it and iterate"

### Project Management Approach
- Break work into clear tickets
- Estimate time honestly (user is experienced, knows estimates are guesses)
- Flag dependencies and blockers
- No bullshit - if something's complex, say so

### Artifact Usage
- Use artifacts for: tickets, schemas, code samples, documentation
- Keep conversation natural, artifacts for reference material
- User will refine artifacts, so make them complete starting points

---

## AI Coding Agent Workflow

**CRITICAL: You are working on a real codebase. Follow these rules strictly.**

### Ticket-Based Development

**ONE TICKET AT A TIME:**
- Never work on multiple tickets simultaneously
- Complete current ticket before starting next
- Ask user which ticket to work on if unclear
- Don't assume next ticket - wait for explicit instruction

**Before Starting Any Ticket:**
1. Read the ticket completely
2. Check dependencies (does this require other tickets first?)
3. Review relevant SKILL.md files if applicable
4. Understand acceptance criteria
5. Ask clarifying questions if anything is unclear

**While Working on Ticket:**
1. Follow the technical implementation guidance in the ticket
2. Write tests alongside code (Phase 1 ticket 1.2 sets this up)
3. Keep changes focused on ticket scope
4. Don't add "nice to have" features outside ticket
5. Run tests frequently to catch issues early

**When You Get Stuck:**
- **ASK FOR HELP IMMEDIATELY** - Don't spin on a problem
- Explain what you've tried
- Share the specific error or issue
- Ask specific questions about the approach
- Don't make up solutions or hallucinate APIs

**After Completing Ticket:**
1. Run all tests (`npm test`)
2. Verify all acceptance criteria met
3. Check for console errors/warnings
4. Summarize what was implemented
5. Note any deviations from ticket
6. Ask user to review before moving on

### Code Quality Standards

**Write Code That:**
- Has clear variable/function names
- Includes error handling
- Has comments explaining "why" not "what"
- Follows existing patterns in codebase
- Doesn't repeat yourself (DRY)

**Don't:**
- Invent APIs that don't exist
- Make assumptions about file paths without checking
- Skip error handling "for now"
- Leave TODO comments without context
- Copy code examples without understanding them

### Testing Requirements

**Every Feature Needs:**
- Unit tests for business logic
- Component tests for UI (if React)
- Integration tests for workflows
- Edge case tests

**Run Tests:**
- After every significant change
- Before marking ticket complete
- After refactoring
- When debugging issues

### File Organization

**Follow These Rules:**
- Code goes in `/src` directory
- Tests alongside code (`.test.js` or `.test.jsx`)
- Put completed work in `/mnt/user-data/outputs` if user needs to see it
- Don't create files in random locations
- Ask before creating new directory structures

### Common Pitfalls to Avoid

**❌ DON'T:**
- Work on multiple tickets at once
- Add features not in the ticket
- Skip writing tests
- Assume file paths exist without checking
- Make up library APIs
- Continue when stuck - ASK FOR HELP
- Commit code that doesn't run
- Skip error handling

**✅ DO:**
- One ticket at a time
- Follow ticket acceptance criteria exactly
- Write tests as you code
- Use `view` tool to check file contents
- Read documentation for libraries
- Ask questions when uncertain
- Test your code before saying it's done
- Handle errors gracefully

### Example Workflow

```
User: "Work on Phase 1, Ticket 1.1 - Project Setup"

You: 
1. Read ticket 1.1 completely
2. Note it has no dependencies (it's ticket 1.1)
3. Check if there are relevant skills (there aren't for setup)
4. Start implementation:
   - Initialize package.json
   - Install dependencies
   - Set up Electron main/renderer structure
   - Configure webpack/vite
   - Test that app launches
   - Verify dev hot-reload works
5. Run through acceptance criteria checklist
6. Report completion with summary

[If you get stuck on webpack config:]
"I'm having trouble configuring webpack for Electron with React. 
I've tried [X approach] but getting [specific error]. 
Should I use Vite instead, or is there a specific webpack 
configuration pattern you prefer?"

[Don't just:]
"I'll set up a basic webpack config" <creates broken config>
```

### When Working with External Libraries

**Before Using a Library:**
1. Check it's in package.json or ticket dependencies
2. Read its actual documentation
3. Verify the API you're using exists
4. Test with simple example first

**Don't:**
- Make up method names
- Assume API based on "what seems logical"
- Mix incompatible library versions
- Use deprecated APIs without noting it

### Handling Uncertainty

**If You're Not Sure:**
- About the approach → Ask before implementing
- About file structure → Ask where files should go
- About library usage → Read docs, then ask if still unclear
- About design decision → Explain options, ask preference
- About test coverage → Ask what level needed

**Never:**
- Guess and hope it works
- Implement something you don't understand
- Skip asking because "it seems minor"
- Make architectural decisions alone

### Progress Reporting

**After Each Work Session:**
- What ticket you worked on
- What was completed
- What's remaining (if ticket not done)
- Any issues encountered
- Any deviations from ticket
- Next steps

**Keep It Concise:**
```
✅ Completed Ticket 1.1 - Project Setup
- Electron + React app boots
- Hot reload works
- All dependencies installed
- Tests passing

Ready for next ticket.
```

### Red Flags to Watch For

**Stop and Ask If:**
- Tests are failing and you don't know why
- Same error appears repeatedly
- Implementation doesn't match ticket description
- Need to change multiple files you didn't expect
- Something that should be simple is complex
- User expectations unclear

### Remember

**This is real code that will be used daily.**
- Quality matters more than speed
- Working code beats clever code
- Tests prevent future pain
- Ask questions early and often
- One ticket at a time
- Ship when it works, not when it's perfect

---

## Project Status

**Current Phase:** Phase 1 Planning  
**Next Steps:**
1. Review Phase 1 tickets
2. Set up development environment
3. Begin implementation (no hard deadline)

**What's Complete:**
- Feature scope defined
- Tech stack decided
- Database schema designed
- Phase 1 broken into tickets
- V2 features tracked

**What's Next:**
- Project setup (Ticket 1.1)
- Get first import working
- Build out UI shell
- Validate approach with real music files

---

## Questions to Ask User Before Implementing

**Phase-Specific:**
- Have I understood the UI layout correctly?
- Is the database schema covering all needed metadata?
- Are there specific audio formats beyond MP3/FLAC/M4A needed?
- Any specific artwork dimension requirements?

**Feature-Specific:**
- What should happen with duplicate imports? (Skip, rename, prompt?)
- Should playlists auto-update if tracks are deleted?
- How should "Various Artists" compilations display?
- What EQ presets matter? (Rock, Jazz, Classical, etc.)

**Technical:**
- Should we support existing iTunes library import?
- Any specific keyboard shortcuts expected?
- What's acceptable import speed? (files per second)

---

## Remember

This is a **personal tool** built by someone who:
- Knows what they want
- Values quality over speed
- Will iterate based on real use
- Appreciates thoughtful engineering
- Has strong opinions on UX (from design background)

The goal isn't to build iTunes. It's to build **the music library manager this user wishes existed**.

Build it right. Make it beautiful. Don't compromise on the details that matter.

🤘
