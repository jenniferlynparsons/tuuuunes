// QueueManager tests
import QueueManager from './QueueManager';

// Helper to create mock track objects
const createTrack = (id, title = `Track ${id}`) => ({
  track_id: id,
  title,
  artist: 'Test Artist',
  album: 'Test Album',
  file_path: `/path/to/track${id}.mp3`,
  duration_seconds: 180,
});

describe('QueueManager', () => {
  let queueManager;

  beforeEach(() => {
    queueManager = new QueueManager();
  });

  describe('initialization', () => {
    test('should start with empty queue', () => {
      expect(queueManager.getQueue()).toEqual([]);
      expect(queueManager.getCurrentIndex()).toBe(-1);
      expect(queueManager.isEmpty()).toBe(true);
    });

    test('should have empty history', () => {
      expect(queueManager.getHistory()).toEqual([]);
    });
  });

  describe('setQueue', () => {
    test('should set queue with tracks', () => {
      const tracks = [createTrack(1), createTrack(2), createTrack(3)];

      queueManager.setQueue(tracks);

      expect(queueManager.getQueue()).toEqual(tracks);
      expect(queueManager.getCurrentIndex()).toBe(0);
      expect(queueManager.getLength()).toBe(3);
    });

    test('should create a copy of tracks array', () => {
      const tracks = [createTrack(1)];
      queueManager.setQueue(tracks);

      tracks.push(createTrack(2));

      expect(queueManager.getLength()).toBe(1);
    });

    test('should reset history when setting new queue', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);
      queueManager.next();

      queueManager.setQueue([createTrack(3)]);

      expect(queueManager.getHistory()).toEqual([]);
    });

    test('should handle empty array', () => {
      queueManager.setQueue([]);

      expect(queueManager.isEmpty()).toBe(true);
      expect(queueManager.getCurrentIndex()).toBe(-1);
    });
  });

  describe('addToQueue', () => {
    test('should add track to end of queue', () => {
      queueManager.setQueue([createTrack(1)]);

      queueManager.addToQueue(createTrack(2));

      expect(queueManager.getLength()).toBe(2);
      expect(queueManager.getQueue()[1].track_id).toBe(2);
    });

    test('should set index to 0 when adding to empty queue', () => {
      queueManager.addToQueue(createTrack(1));

      expect(queueManager.getCurrentIndex()).toBe(0);
      expect(queueManager.getCurrentTrack().track_id).toBe(1);
    });

    test('should not change current index when adding to non-empty queue', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);
      queueManager.playTrackAt(1);

      queueManager.addToQueue(createTrack(3));

      expect(queueManager.getCurrentIndex()).toBe(1);
    });
  });

  describe('insertNext', () => {
    test('should insert track after current position', () => {
      queueManager.setQueue([createTrack(1), createTrack(3)]);

      queueManager.insertNext(createTrack(2));

      expect(queueManager.getQueue()[1].track_id).toBe(2);
      expect(queueManager.getQueue()[2].track_id).toBe(3);
    });

    test('should handle insert when at end of queue', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);
      queueManager.playTrackAt(1);

      queueManager.insertNext(createTrack(3));

      expect(queueManager.getQueue()[2].track_id).toBe(3);
    });

    test('should handle insert on empty queue', () => {
      queueManager.insertNext(createTrack(1));

      expect(queueManager.getLength()).toBe(1);
      expect(queueManager.getCurrentIndex()).toBe(0);
    });
  });

  describe('removeFromQueue', () => {
    beforeEach(() => {
      queueManager.setQueue([
        createTrack(1),
        createTrack(2),
        createTrack(3),
        createTrack(4),
      ]);
    });

    test('should remove track at index', () => {
      const removed = queueManager.removeFromQueue(1);

      expect(removed.track_id).toBe(2);
      expect(queueManager.getLength()).toBe(3);
    });

    test('should return null for invalid index', () => {
      expect(queueManager.removeFromQueue(-1)).toBeNull();
      expect(queueManager.removeFromQueue(10)).toBeNull();
    });

    test('should adjust index when removing track before current', () => {
      queueManager.playTrackAt(2); // On track 3

      queueManager.removeFromQueue(0); // Remove track 1

      expect(queueManager.getCurrentIndex()).toBe(1);
      expect(queueManager.getCurrentTrack().track_id).toBe(3);
    });

    test('should not adjust index when removing track after current', () => {
      queueManager.playTrackAt(1); // On track 2

      queueManager.removeFromQueue(3); // Remove track 4

      expect(queueManager.getCurrentIndex()).toBe(1);
      expect(queueManager.getCurrentTrack().track_id).toBe(2);
    });

    test('should handle removing current track (slides to next)', () => {
      queueManager.playTrackAt(1); // On track 2

      queueManager.removeFromQueue(1); // Remove current

      // Index stays same, but next track slides in
      expect(queueManager.getCurrentIndex()).toBe(1);
      expect(queueManager.getCurrentTrack().track_id).toBe(3);
    });

    test('should handle removing current track when at end', () => {
      queueManager.playTrackAt(3); // On track 4 (last)

      queueManager.removeFromQueue(3);

      expect(queueManager.getCurrentIndex()).toBe(2);
      expect(queueManager.getCurrentTrack().track_id).toBe(3);
    });

    test('should handle removing last track in queue', () => {
      queueManager.setQueue([createTrack(1)]);

      queueManager.removeFromQueue(0);

      expect(queueManager.isEmpty()).toBe(true);
      expect(queueManager.getCurrentIndex()).toBe(-1);
    });
  });

  describe('moveTrack', () => {
    beforeEach(() => {
      queueManager.setQueue([
        createTrack(1),
        createTrack(2),
        createTrack(3),
        createTrack(4),
      ]);
    });

    test('should move track forward in queue', () => {
      queueManager.moveTrack(0, 2);

      expect(queueManager.getQueue()[0].track_id).toBe(2);
      expect(queueManager.getQueue()[1].track_id).toBe(3);
      expect(queueManager.getQueue()[2].track_id).toBe(1);
    });

    test('should move track backward in queue', () => {
      queueManager.moveTrack(3, 1);

      expect(queueManager.getQueue()[0].track_id).toBe(1);
      expect(queueManager.getQueue()[1].track_id).toBe(4);
      expect(queueManager.getQueue()[2].track_id).toBe(2);
    });

    test('should update currentIndex when moving current track', () => {
      queueManager.playTrackAt(1); // On track 2

      queueManager.moveTrack(1, 3);

      expect(queueManager.getCurrentIndex()).toBe(3);
      expect(queueManager.getCurrentTrack().track_id).toBe(2);
    });

    test('should adjust index when track moved from before to after current', () => {
      queueManager.playTrackAt(2); // On track 3

      queueManager.moveTrack(0, 3); // Move track 1 to end

      expect(queueManager.getCurrentIndex()).toBe(1);
      expect(queueManager.getCurrentTrack().track_id).toBe(3);
    });

    test('should adjust index when track moved from after to before current', () => {
      queueManager.playTrackAt(1); // On track 2

      queueManager.moveTrack(3, 0); // Move track 4 to start

      expect(queueManager.getCurrentIndex()).toBe(2);
      expect(queueManager.getCurrentTrack().track_id).toBe(2);
    });

    test('should return false for invalid indices', () => {
      expect(queueManager.moveTrack(-1, 2)).toBe(false);
      expect(queueManager.moveTrack(0, 10)).toBe(false);
    });
  });

  describe('getCurrentTrack', () => {
    test('should return null for empty queue', () => {
      expect(queueManager.getCurrentTrack()).toBeNull();
    });

    test('should return current track', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);

      expect(queueManager.getCurrentTrack().track_id).toBe(1);

      queueManager.next();

      expect(queueManager.getCurrentTrack().track_id).toBe(2);
    });
  });

  describe('getNextTrack', () => {
    test('should return null for empty queue', () => {
      expect(queueManager.getNextTrack()).toBeNull();
    });

    test('should return next track without advancing', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);

      expect(queueManager.getNextTrack().track_id).toBe(2);
      expect(queueManager.getCurrentTrack().track_id).toBe(1);
    });

    test('should return null when at end', () => {
      queueManager.setQueue([createTrack(1)]);

      expect(queueManager.getNextTrack()).toBeNull();
    });
  });

  describe('getPreviousTrack', () => {
    test('should return null for empty queue', () => {
      expect(queueManager.getPreviousTrack()).toBeNull();
    });

    test('should return previous track without going back', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);
      queueManager.next();

      expect(queueManager.getPreviousTrack().track_id).toBe(1);
      expect(queueManager.getCurrentTrack().track_id).toBe(2);
    });

    test('should return null when at beginning', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);

      expect(queueManager.getPreviousTrack()).toBeNull();
    });
  });

  describe('next', () => {
    test('should advance to next track', () => {
      queueManager.setQueue([createTrack(1), createTrack(2), createTrack(3)]);

      const nextTrack = queueManager.next();

      expect(nextTrack.track_id).toBe(2);
      expect(queueManager.getCurrentIndex()).toBe(1);
    });

    test('should add previous track to history', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);

      queueManager.next();

      expect(queueManager.getHistory()).toHaveLength(1);
      expect(queueManager.getHistory()[0].track_id).toBe(1);
    });

    test('should return null at end of queue', () => {
      queueManager.setQueue([createTrack(1)]);

      expect(queueManager.next()).toBeNull();
      expect(queueManager.getCurrentIndex()).toBe(0);
    });

    test('should return null for empty queue', () => {
      expect(queueManager.next()).toBeNull();
    });
  });

  describe('previous', () => {
    test('should go back to previous track', () => {
      queueManager.setQueue([createTrack(1), createTrack(2), createTrack(3)]);
      queueManager.playTrackAt(2);

      const prevTrack = queueManager.previous();

      expect(prevTrack.track_id).toBe(2);
      expect(queueManager.getCurrentIndex()).toBe(1);
    });

    test('should return null at beginning of queue', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);

      expect(queueManager.previous()).toBeNull();
      expect(queueManager.getCurrentIndex()).toBe(0);
    });

    test('should return null for empty queue', () => {
      expect(queueManager.previous()).toBeNull();
    });
  });

  describe('playTrackAt', () => {
    beforeEach(() => {
      queueManager.setQueue([
        createTrack(1),
        createTrack(2),
        createTrack(3),
        createTrack(4),
      ]);
    });

    test('should jump to specific position', () => {
      const track = queueManager.playTrackAt(2);

      expect(track.track_id).toBe(3);
      expect(queueManager.getCurrentIndex()).toBe(2);
    });

    test('should add to history when jumping forward', () => {
      queueManager.playTrackAt(2);

      expect(queueManager.getHistory()).toHaveLength(1);
      expect(queueManager.getHistory()[0].track_id).toBe(1);
    });

    test('should not add to history when jumping backward', () => {
      queueManager.playTrackAt(3);
      queueManager.playTrackAt(1);

      // Only one entry from the first jump
      expect(queueManager.getHistory()).toHaveLength(1);
    });

    test('should return null for invalid index', () => {
      expect(queueManager.playTrackAt(-1)).toBeNull();
      expect(queueManager.playTrackAt(10)).toBeNull();
    });
  });

  describe('clear', () => {
    test('should clear queue and reset state', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);
      queueManager.next();

      queueManager.clear();

      expect(queueManager.isEmpty()).toBe(true);
      expect(queueManager.getCurrentIndex()).toBe(-1);
      expect(queueManager.getHistory()).toEqual([]);
    });
  });

  describe('getQueue', () => {
    test('should return copy of queue', () => {
      const tracks = [createTrack(1), createTrack(2)];
      queueManager.setQueue(tracks);

      const queue = queueManager.getQueue();
      queue.push(createTrack(3));

      expect(queueManager.getLength()).toBe(2);
    });
  });

  describe('hasNext / hasPrevious', () => {
    test('hasNext should return correct value', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);

      expect(queueManager.hasNext()).toBe(true);

      queueManager.next();

      expect(queueManager.hasNext()).toBe(false);
    });

    test('hasPrevious should return correct value', () => {
      queueManager.setQueue([createTrack(1), createTrack(2)]);

      expect(queueManager.hasPrevious()).toBe(false);

      queueManager.next();

      expect(queueManager.hasPrevious()).toBe(true);
    });

    test('both should be false for empty queue', () => {
      expect(queueManager.hasNext()).toBe(false);
      expect(queueManager.hasPrevious()).toBe(false);
    });
  });

  describe('findTrackIndex', () => {
    test('should find track by track_id', () => {
      queueManager.setQueue([createTrack(1), createTrack(2), createTrack(3)]);

      expect(queueManager.findTrackIndex(2)).toBe(1);
    });

    test('should return -1 for not found', () => {
      queueManager.setQueue([createTrack(1)]);

      expect(queueManager.findTrackIndex(99)).toBe(-1);
    });
  });

  describe('edge cases', () => {
    test('single track queue - next returns null', () => {
      queueManager.setQueue([createTrack(1)]);

      expect(queueManager.next()).toBeNull();
      expect(queueManager.getCurrentTrack().track_id).toBe(1);
    });

    test('single track queue - previous returns null', () => {
      queueManager.setQueue([createTrack(1)]);

      expect(queueManager.previous()).toBeNull();
      expect(queueManager.getCurrentTrack().track_id).toBe(1);
    });

    test('rapid navigation maintains consistency', () => {
      queueManager.setQueue([
        createTrack(1),
        createTrack(2),
        createTrack(3),
        createTrack(4),
        createTrack(5),
      ]);

      queueManager.next();
      queueManager.next();
      queueManager.previous();
      queueManager.next();
      queueManager.next();

      expect(queueManager.getCurrentIndex()).toBe(3);
      expect(queueManager.getCurrentTrack().track_id).toBe(4);
    });

    test('operations on queue with duplicates', () => {
      const track = createTrack(1);
      queueManager.setQueue([track, track, track]);

      queueManager.next();
      expect(queueManager.getCurrentIndex()).toBe(1);

      queueManager.removeFromQueue(1);
      expect(queueManager.getCurrentIndex()).toBe(1);
      expect(queueManager.getLength()).toBe(2);
    });
  });
});
