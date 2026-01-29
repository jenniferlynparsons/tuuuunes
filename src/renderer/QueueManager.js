// QueueManager - Manages playback queue for track navigation
// Handles queue manipulation, track navigation, and history

/**
 * Manages the playback queue for track navigation
 * Tracks current position, supports add/remove operations, and maintains history
 */
class QueueManager {
  constructor() {
    this.queue = [];
    this.currentIndex = -1;
    this.history = [];
  }

  /**
   * Replace the entire queue with new tracks
   * @param {Array} tracks - Array of track objects
   */
  setQueue(tracks) {
    this.queue = [...tracks];
    this.currentIndex = tracks.length > 0 ? 0 : -1;
    this.history = [];
  }

  /**
   * Add a track to the end of the queue
   * @param {Object} track - Track object to add
   */
  addToQueue(track) {
    this.queue.push(track);
    // If queue was empty, set index to the new track
    if (this.currentIndex === -1) {
      this.currentIndex = 0;
    }
  }

  /**
   * Insert a track to play next (after current track)
   * @param {Object} track - Track object to insert
   */
  insertNext(track) {
    if (this.currentIndex === -1) {
      // Empty queue, just add the track
      this.queue.push(track);
      this.currentIndex = 0;
    } else {
      this.queue.splice(this.currentIndex + 1, 0, track);
    }
  }

  /**
   * Remove a track from the queue by index
   * Adjusts currentIndex if necessary
   * @param {number} index - Index of track to remove
   * @returns {Object|null} The removed track or null if index invalid
   */
  removeFromQueue(index) {
    if (index < 0 || index >= this.queue.length) {
      return null;
    }

    const removed = this.queue.splice(index, 1)[0];

    // Adjust currentIndex based on removal position
    if (this.queue.length === 0) {
      // Queue is now empty
      this.currentIndex = -1;
    } else if (index < this.currentIndex) {
      // Removed before current, shift index down
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      // Removed current track
      // If at end, move back; otherwise stay (next track slides into position)
      if (this.currentIndex >= this.queue.length) {
        this.currentIndex = this.queue.length - 1;
      }
    }
    // If removed after current, no adjustment needed

    return removed;
  }

  /**
   * Move a track from one position to another
   * @param {number} fromIndex - Current index of track
   * @param {number} toIndex - Target index for track
   * @returns {boolean} True if move succeeded
   */
  moveTrack(fromIndex, toIndex) {
    if (
      fromIndex < 0 ||
      fromIndex >= this.queue.length ||
      toIndex < 0 ||
      toIndex >= this.queue.length
    ) {
      return false;
    }

    const [track] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, track);

    // Adjust currentIndex if it was affected
    if (fromIndex === this.currentIndex) {
      // The current track was moved
      this.currentIndex = toIndex;
    } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
      // Track moved from before current to at/after current
      this.currentIndex--;
    } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
      // Track moved from after current to at/before current
      this.currentIndex++;
    }

    return true;
  }

  /**
   * Get the currently playing track
   * @returns {Object|null} Current track or null if queue empty
   */
  getCurrentTrack() {
    if (this.currentIndex < 0 || this.currentIndex >= this.queue.length) {
      return null;
    }
    return this.queue[this.currentIndex];
  }

  /**
   * Get the next track without advancing
   * @returns {Object|null} Next track or null if at end
   */
  getNextTrack() {
    if (this.currentIndex < this.queue.length - 1) {
      return this.queue[this.currentIndex + 1];
    }
    return null;
  }

  /**
   * Get the previous track without going back
   * @returns {Object|null} Previous track or null if at beginning
   */
  getPreviousTrack() {
    if (this.currentIndex > 0) {
      return this.queue[this.currentIndex - 1];
    }
    return null;
  }

  /**
   * Advance to next track
   * @returns {Object|null} The next track or null if at end
   */
  next() {
    if (this.currentIndex < this.queue.length - 1) {
      // Add current track to history before advancing
      const currentTrack = this.getCurrentTrack();
      if (currentTrack) {
        this.history.push(currentTrack);
      }
      this.currentIndex++;
      return this.getCurrentTrack();
    }
    return null;
  }

  /**
   * Go back to previous track
   * @returns {Object|null} The previous track or null if at beginning
   */
  previous() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.getCurrentTrack();
    }
    return null;
  }

  /**
   * Jump to a specific position in the queue
   * @param {number} index - Index to jump to
   * @returns {Object|null} Track at that position or null if invalid
   */
  playTrackAt(index) {
    if (index >= 0 && index < this.queue.length) {
      // Add current track to history if moving forward
      if (index > this.currentIndex) {
        const currentTrack = this.getCurrentTrack();
        if (currentTrack) {
          this.history.push(currentTrack);
        }
      }
      this.currentIndex = index;
      return this.getCurrentTrack();
    }
    return null;
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue = [];
    this.currentIndex = -1;
    this.history = [];
  }

  /**
   * Get the entire queue
   * @returns {Array} Copy of the queue array
   */
  getQueue() {
    return [...this.queue];
  }

  /**
   * Get the current queue length
   * @returns {number} Number of tracks in queue
   */
  getLength() {
    return this.queue.length;
  }

  /**
   * Get the current index
   * @returns {number} Current track index (-1 if empty)
   */
  getCurrentIndex() {
    return this.currentIndex;
  }

  /**
   * Check if there's a next track
   * @returns {boolean} True if can advance
   */
  hasNext() {
    return this.currentIndex < this.queue.length - 1;
  }

  /**
   * Check if there's a previous track
   * @returns {boolean} True if can go back
   */
  hasPrevious() {
    return this.currentIndex > 0;
  }

  /**
   * Check if queue is empty
   * @returns {boolean} True if queue has no tracks
   */
  isEmpty() {
    return this.queue.length === 0;
  }

  /**
   * Get playback history
   * @returns {Array} Copy of history array
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Find a track's index in the queue by track_id
   * @param {number} trackId - The track_id to search for
   * @returns {number} Index of track or -1 if not found
   */
  findTrackIndex(trackId) {
    return this.queue.findIndex((track) => track.track_id === trackId);
  }
}

export default QueueManager;
