import { describe, it, expect, vi, beforeEach } from 'vitest';
import seatLocksApi from '../../services/api/seat-locks.api';
import { useSeatLockStore } from '../../store/seatLock.store';

vi.mock('../../services/api/seat-locks.api');

describe('Seat Locking Workflow & Conflict Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSeatLockStore.setState({
      showId: null,
      lockId: null,
      lockedSeatIds: [],
      remainingSeconds: 0,
      isExpired: false
    });
  });

  it('stores active lock and starts countdown timer upon successful lock response', async () => {
    seatLocksApi.lockSeats.mockResolvedValueOnce({
      success: true,
      data: {
        lockId: 'lock-redis-99',
        expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
        ttlSeconds: 300,
        lockedSeats: ['s1', 's2']
      }
    });

    const res = await seatLocksApi.lockSeats('show-1', ['s1', 's2'], 'idemp-1');
    const { lockId, expiresAt, ttlSeconds } = res.data;

    useSeatLockStore.getState().setLock({
      showId: 'show-1',
      lockId,
      lockedSeatIds: ['s1', 's2'],
      expiresAt,
      ttlSeconds
    });

    const state = useSeatLockStore.getState();
    expect(state.lockId).toBe('lock-redis-99');
    expect(state.remainingSeconds).toBeGreaterThan(290);
    expect(state.isExpired).toBe(false);
  });

  it('handles lock failure when seats are contested or unavailable', async () => {
    seatLocksApi.lockSeats.mockRejectedValueOnce(
      new Error('One or more seats have already been locked by another customer')
    );

    await expect(
      seatLocksApi.lockSeats('show-1', ['s1'], 'idemp-conflict')
    ).rejects.toThrow('One or more seats have already been locked by another customer');
  });

  it('releases active lock on clearLock', async () => {
    seatLocksApi.releaseSeats.mockResolvedValueOnce({ success: true });

    useSeatLockStore.setState({
      showId: 'show-1',
      lockId: 'lock-redis-99',
      lockedSeatIds: ['s1']
    });

    await useSeatLockStore.getState().clearLock();

    expect(seatLocksApi.releaseSeats).toHaveBeenCalledWith('show-1', ['s1'], 'lock-redis-99');
    expect(useSeatLockStore.getState().lockId).toBeNull();
  });
});

