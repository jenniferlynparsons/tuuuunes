# Tuuunes

A modern music library manager combining iTunes 11's superior information architecture with iTunes 12's visual design.

## Project Overview

Tuuunes is a personal music library manager built to bring back the best parts of iTunes 11 while incorporating modern design and technology. It's designed for people who prefer managing their own music library over streaming services.

### Key Features

- **Smart Library Management**: Import and organize music files (MP3, FLAC, M4A) with comprehensive metadata support
- **Multi-Genre Tagging**: Tag tracks with multiple genres for better organization
- **Powerful Playback**: Full-featured audio player with 10-band equalizer
- **Beautiful Views**: Library list, album gallery with blurred backgrounds, and custom playlists
- **Metadata Editing**: Edit track info, batch editing, and artwork management
- **Fast Search**: Global search across your library with advanced filters

## Tech Stack

- **Electron**: Native desktop application framework
- **React**: Modern UI components and state management
- **SQLite**: Fast, local database for metadata
- **Web Audio API**: High-quality audio playback and effects

## Platform

- macOS (primary target)
- Cross-platform potential for future releases

## Development Status

Currently in planning phase. See the [project plan](project plan/PROJECT-OVERVIEW.md) for detailed implementation roadmap.

### Development Phases

1. **Phase 1: Foundation** - Infrastructure, database, import, basic UI shell
2. **Phase 2: Playback Core** - Audio engine, queue management, playback controls
3. **Phase 3: Views Implementation** - Library list, album gallery, playlist management
4. **Phase 4: Polish & Features** - EQ, metadata editing, search, visual polish
5. **Phase 5: Edge Cases & Optimization** - Performance, error handling, production readiness

## Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- npm or yarn package manager
- macOS (primary development platform)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

```bash
npm run dev
```

### Testing

The project uses Jest for testing with separate configurations for main process (Node.js) and renderer process (React/JSDOM) code.

#### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

#### Test Structure

Tests are located alongside the code they test:

```
src/
├── main/
│   ├── database.js
│   └── database.test.js        # Unit tests for database
├── renderer/
│   └── components/
│       ├── Sidebar.jsx
│       └── Sidebar.test.jsx    # Component tests
└── tests/
    ├── fixtures/               # Test fixtures and sample data
    │   ├── audio/              # Sample audio files (MP3, FLAC, M4A)
    │   └── metadata/           # Sample metadata JSON
    └── setup.js                # Test environment setup
```

#### Coverage Goals

- Target: >80% coverage on core business logic
- Main process: Database operations, file handling, metadata extraction
- Renderer: React components, UI interactions

#### Test Fixtures

Sample audio files are located in `tests/fixtures/audio/`:
- `test.mp3` - MP3 with complete metadata
- `test.flac` - FLAC with Vorbis comments
- `test.m4a` - M4A with iTunes metadata
- `no-tags.mp3` - MP3 without metadata (for edge case testing)

## Why Tuuunes?

Modern streaming services are great, but sometimes you want full control over your music library. Tuuunes is being built for people who:

- Own their music files and want a great way to organize them
- Miss the information architecture of iTunes 11
- Want a lightweight, focused music player
- Prefer local libraries over streaming services

## License

Personal project - not currently open source.
