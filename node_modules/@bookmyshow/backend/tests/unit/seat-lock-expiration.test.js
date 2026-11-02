import { jest } from '@jest/globals';
import LockExpirationService from '../../src/modules/seat-locks/lock-expiration.service.js';
import SeatLockSocket from '../../src/modules/seat-locks/seat-lock.socket.js';
import { parseSeatLockKey } from '../../src/modules/seat-locks/seat-lock.utils.js';

describe('Lock Expiration & Sweeper Unit Tests', () => {
  beforeEach(() => {
    jest.spyOn(SeatLockSocket, 'emitSeatExpired').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should parse Redis seat lock key into showId and seatId components', () => {
    const key = 'seatlock:show-123:seat-456';
    const parsed = parseSeatLockKey(key);

    expect(parsed).toEqual({
      showId: 'show-123',
      seatId: 'seat-456'
    });
  });

  it('should return null for malformed Redis key', () => {
    expect(parseSeatLockKey('other:key')).toBeNull();
    expect(parseSeatLockKey(null)).toBeNull();
    expect(parseSeatLockKey('seatlock:too:many:colons')).toBeNull();
  });

  it('should trigger broadcast when expired seats are handled', async () => {
    await LockExpirationService.handleExpiredSeats('show-1', ['seat-1', 'seat-2']);

    expect(SeatLockSocket.emitSeatExpired).toHaveBeenCalledWith('show-1', ['seat-1', 'seat-2']);
  });
});
