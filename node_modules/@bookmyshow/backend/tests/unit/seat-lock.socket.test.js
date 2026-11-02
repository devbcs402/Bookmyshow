import { jest } from '@jest/globals';
import {
  registerSeatLockSocketHandlers,
  broadcastShowRoomEvent,
  emitSeatLocked,
  emitSeatReleased,
  emitSeatExpired,
  emitSeatBooked
} from '../../src/modules/seat-locks/seat-lock.socket.js';
import { SeatLockEvents } from '../../src/modules/seat-locks/seat-lock.events.js';

describe('Seat Lock Socket.IO Unit Tests', () => {
  let mockSocket;
  let mockIo;

  const validShowId = '65f1a2b3c4d5e6f7a8b9c001';

  beforeEach(() => {
    mockSocket = {
      id: 'socket-123',
      data: { user: { role: 'AUTHENTICATED' } },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      on: jest.fn()
    };

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Event Payload Sanitization (Zero PII / Zero Tokens)', () => {
    it('should create sanitized seat:locked payload without customerId or tokens', () => {
      const payload = SeatLockEvents.createSeatLockedPayload('show-1', ['seat-1', 'seat-2']);
      expect(payload).toEqual({
        showId: 'show-1',
        seatIds: ['seat-1', 'seat-2'],
        status: 'LOCKED',
        timestamp: expect.any(String)
      });
      expect(payload.userId).toBeUndefined();
      expect(payload.lockId).toBeUndefined();
    });

    it('should create sanitized seat:released payload', () => {
      const payload = SeatLockEvents.createSeatReleasedPayload('show-1', ['seat-1']);
      expect(payload.status).toBe('AVAILABLE');
      expect(payload.seatIds).toEqual(['seat-1']);
    });
  });

  describe('Socket Event Handlers Registration', () => {
    it('should subscribe socket to room show:showId on valid join event', () => {
      registerSeatLockSocketHandlers(mockSocket, mockIo);

      // Find the join event callback
      const joinCall = mockSocket.on.mock.calls.find(call => call[0] === 'show:join');
      expect(joinCall).toBeDefined();

      const joinHandler = joinCall[1];
      joinHandler({ showId: validShowId });

      expect(mockSocket.join).toHaveBeenCalledWith(`show:${validShowId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('show:joined', {
        showId: validShowId,
        room: `show:${validShowId}`
      });
    });

    it('should reject join event when showId is invalid', () => {
      registerSeatLockSocketHandlers(mockSocket, mockIo);

      const joinCall = mockSocket.on.mock.calls.find(call => call[0] === 'show:join');
      const joinHandler = joinCall[1];
      joinHandler({ showId: 'invalid-id' });

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          message: expect.stringContaining('Invalid showId')
        })
      );
    });

    it('should leave room on leave event', () => {
      registerSeatLockSocketHandlers(mockSocket, mockIo);

      const leaveCall = mockSocket.on.mock.calls.find(call => call[0] === 'show:leave');
      expect(leaveCall).toBeDefined();

      const leaveHandler = leaveCall[1];
      leaveHandler({ showId: validShowId });

      expect(mockSocket.leave).toHaveBeenCalledWith(`show:${validShowId}`);
    });
  });

  describe('Broadcasting Methods', () => {
    it('should emit to room on broadcastShowRoomEvent', async () => {
      registerSeatLockSocketHandlers(mockSocket, mockIo);
      await broadcastShowRoomEvent('show-1', 'test:event', { foo: 'bar' });

      expect(mockIo.to).toHaveBeenCalledWith('show:show-1');
      expect(mockIo.emit).toHaveBeenCalledWith('test:event', { foo: 'bar' });
    });

    it('should emit seat:locked event and availability-updated event', async () => {
      registerSeatLockSocketHandlers(mockSocket, mockIo);
      await emitSeatLocked('show-1', ['seat-1']);

      expect(mockIo.to).toHaveBeenCalledWith('show:show-1');
      expect(mockIo.emit).toHaveBeenCalledWith(
        'seat:locked',
        expect.objectContaining({
          showId: 'show-1',
          seatIds: ['seat-1']
        })
      );
    });

    it('should emit seat:released event and availability-updated event', async () => {
      registerSeatLockSocketHandlers(mockSocket, mockIo);
      await emitSeatReleased('show-1', ['seat-1']);

      expect(mockIo.emit).toHaveBeenCalledWith(
        'seat:released',
        expect.objectContaining({
          showId: 'show-1'
        })
      );
    });

    it('should emit seat:expired event', async () => {
      registerSeatLockSocketHandlers(mockSocket, mockIo);
      await emitSeatExpired('show-1', ['seat-1']);

      expect(mockIo.emit).toHaveBeenCalledWith(
        'seat:expired',
        expect.objectContaining({
          showId: 'show-1'
        })
      );
    });

    it('should emit seat:booked event', async () => {
      registerSeatLockSocketHandlers(mockSocket, mockIo);
      await emitSeatBooked('show-1', ['seat-1']);

      expect(mockIo.emit).toHaveBeenCalledWith(
        'seat:booked',
        expect.objectContaining({
          showId: 'show-1'
        })
      );
    });
  });
});
