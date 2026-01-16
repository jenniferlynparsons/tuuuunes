// Testing Library setup for React components
import '@testing-library/jest-dom';

// Mock Electron APIs that might be used in renderer components
global.window = global.window || {};
global.window.api = {
  selectFolder: jest.fn(),
  importMusic: jest.fn(),
  getTracks: jest.fn(),
  getAlbums: jest.fn(),
  getPlaylists: jest.fn(),
  updateTrack: jest.fn(),
  createPlaylist: jest.fn(),
  onImportProgress: jest.fn(),
};
