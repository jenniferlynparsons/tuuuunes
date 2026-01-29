# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev           # Start Electron app with Vite hot reload
npm run build         # Build for production (vite build + electron-builder)
npm test              # Run all tests (main + renderer projects)
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Running Specific Tests
```bash
npx jest src/main/database.test.js              # Single test file
npx jest --testNamePattern="should insert"       # Tests matching pattern
npx jest --selectProjects=main                   # Only main process tests
npx jest --selectProjects=renderer               # Only renderer tests
```

## Architecture Overview

### Electron Process Structure
```
electron/
├── main/index.ts       # Main process - IPC handlers, window management, backend init
└── preload/index.ts    # Preload script - exposes 'window.api' to renderer

src/
├── main/               # Main process business logic (Node.js)
│   ├── database.js     # MusicDatabase class - SQLite wrapper with CRUD operations
│   ├── library-manager.js  # File system operations, library path management
│   ├── metadata.js     # Audio metadata extraction using music-metadata
│   └── import.js       # Import pipeline with progress tracking
│
├── renderer/           # Renderer process (React/JSDOM)
│   ├── App.jsx         # Root component - three-panel layout
│   ├── components/     # PlayerBar, Sidebar, MainContent
│   └── contexts/       # ViewContext for navigation state
```

### IPC Communication
Renderer communicates with main process via `window.api.*` (exposed through preload):
```javascript
// Renderer calls:
window.api.getTracks(filters, sort)
window.api.importMusic(folderPath)
window.api.createPlaylist(name, description)

// Maps to handlers in electron/main/index.ts:
ipcMain.handle('db:get-tracks', ...)
ipcMain.handle('file:import', ...)
ipcMain.handle('db:create-playlist', ...)
```

Import progress is communicated via events: `import:progress`, `import:complete`, `import:error`.

### Database Schema (SQLite)
- **tracks**: Core metadata (file_path, title, artist, album_artist, etc.)
- **genres** / **track_genres**: Junction table for multi-genre support
- **playlists** / **playlist_tracks**: Playlist management with position ordering
- **albums**: Cached album info for gallery performance

Key patterns:
- Synchronous operations via better-sqlite3 (no async/await for DB)
- Transactions for multi-step operations
- Prepared statements for all queries
- Whitelist validation for sort columns (SQL injection prevention)

### Testing Configuration
Jest runs two projects (`jest.config.cjs`):
- **main**: Node.js environment for `src/main/**/*.test.js`
- **renderer**: JSDOM environment for `src/renderer/**/*.test.{js,jsx}`

Test fixtures in `tests/fixtures/audio/`: sample MP3, FLAC, M4A files with various metadata states.

## Project Context

**What this is**: Desktop music library manager (Electron + React + SQLite) combining iTunes 11's information architecture with iTunes 12's visual design.

**Library structure** (managed, files are copied):
```
~/Music/Tuuuuunes/
├── Music/Artist Name/Album Name/   # Organized music files
├── Artwork/albums/                 # Content-hashed artwork cache
└── Database/library.db             # SQLite database
```

### Key Design Decisions
- **Managed library only** (V1): Files copied, not referenced
- **Multi-genre support**: Junction table, not single field
- **Album artist vs. track artist**: Separate fields for compilations
- **Synchronous database**: better-sqlite3 for performance

### Current Status
Phase 1 (Foundation) complete. See `project plan/` for detailed tickets by phase.

## Workflow Guidelines

### Ticket-Based Development
1. Work one ticket at a time from `project plan/` directory
2. Check dependencies before starting
3. Write tests alongside code
4. Verify acceptance criteria before marking complete
5. Run `npm test` before finishing

### When Stuck
Ask immediately rather than guessing. Provide:
- What you've tried
- Specific error or issue
- Questions about the approach

### Code Quality
- Document "why" not "what"
- Follow existing patterns in the codebase
- Handle errors gracefully (don't crash on bad input)
- Use transactions for database operations
- Use `:memory:` SQLite for unit tests

### Security
This is an Electron app with filesystem access. Follow these patterns:

**IPC & Input Validation**
- All renderer→main communication goes through the curated `window.api` (never expose raw `ipcRenderer`)
- Validate file paths with `libraryManager.isValidPath()` before any filesystem operations
- Use `ALLOWED_SORT_COLUMNS` whitelist for dynamic SQL (see `database.js`)
- Validate field values with `validateFieldValue()` before database writes

**Filesystem**
- Restrict operations to the library directory (`~/Music/Tuuuuunes/`)
- Sanitize filenames before writing (remove path traversal characters)
- Never construct paths from user input without validation

**Database**
- Always use prepared statements with parameterized queries
- Never interpolate user input into SQL strings
- Validate data types and lengths before insert/update

### Accessibility
Build for keyboard and screen reader users:

**Keyboard Navigation**
- All interactive elements must be focusable and operable via keyboard
- Maintain logical tab order (sidebar → main content → player controls)
- Implement arrow key navigation in lists and grids
- Show visible focus indicators (don't rely on browser defaults in dark theme)

**ARIA & Semantics**
- Use semantic HTML (`<button>`, `<nav>`, `<main>`) over `<div>` with click handlers
- Add `aria-label` to icon-only buttons (play, pause, skip)
- Use `aria-current` for active navigation items
- Mark dynamic content regions with `aria-live` for screen reader announcements

**Visual**
- Maintain sufficient color contrast (4.5:1 for text, 3:1 for UI components)
- Don't convey information through color alone (add icons or text)
- Support reduced motion preference (`prefers-reduced-motion` media query)
- Ensure text remains readable at 200% zoom

## User Preferences

- **Communication**: Complete drafts, bullet points, direct feedback
- **Scope**: Only make changes directly requested - no over-engineering
- **Features deferred to V2**: Gapless playback, smart playlists, shuffle, play counts, CD ripping
