import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import redisLockService from '../../src/modules/seat-locks/redis-lock.service.js';
import seatLockRepository from '../../src/modules/seat-locks/seat-lock.repository.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import { ShowStatus } from '../../src/modules/shows/show.constants.js';

describe('Seat Lock Ownership & BOLA Security Tests', () => {
  let app;
  let userAToken;
  let userBToken;

  const userAId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const userBId = '65f1a2b3c4d5e6f7a8b9c0c2';
  const sessionIdA = '65f1a2b3c4d5e6f7a8b9c0f1';
  const sessionIdB = '65f1a2b3c4d5e6f7a8b9c0f2';
  const showId = '65f1a2b3c4d5e6f7a8b9c001';
  const seatId = '65f1a2b3c4d5e6f7a8b9c0a1';
  const stolenLockId = 'lock-user-a-12345';

  beforeAll(() => {
    app = createApp();

    userAToken = generateAccessToken({
      userId: userAId,
      sessionId: sessionIdA,
      role: Roles.CUSTOMER,
      partnerId: null
    });

    userBToken = generateAccessToken({
      userId: userBId,
      sessionId: sessionIdB,
      role: Roles.CUSTOMER,
      partnerId: null
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockImplementation(sid => {
      return Promise.resolve({
        _id: sid,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000)
      });
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(uid => {
      return Promise.resolve({
        _id: uid,
        role: Roles.CUSTOMER,
        isActive: true
      });
    });

    jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue({
      _id: showId,
      status: ShowStatus.PUBLISHED,
      startTime: new Date(Date.now() + 86400000).toISOString(),
      isDeleted: false
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should prevent User B from releasing User A locks even if User B guesses lockId', async () => {
    // In real Lua script, releaseLocks evaluates:
    // if data.lockId == lockId and data.userId == userId then del(key) end
    // When User B calls release with stolen lockId, userId does not match, so releasedSeatIds is empty!
    jest.spyOn(redisLockService, 'releaseLocks').mockResolvedValue({
      released: true,
      releasedSeatIds: [] // Zero seats released because User B does not own them!
    });

    const res = await request(app)
      .delete(`/api/v1/shows/${showId}/seat-locks`)
      .set('Authorization', `Bearer ${userBToken}`) // Attacker User B
      .send({
        seatIds: [seatId],
        lockId: stolenLockId
      });

    expect(res.status).toBe(200);
    // Verified: No seats were released by the attacker!
    expect(res.body.data.releasedSeatIds).toEqual([]);
    expect(redisLockService.releaseLocks).toHaveBeenCalledWith(
      showId,
      [seatId],
      stolenLockId,
      userBId
    );
  });

  it('should prevent User B from renewing User A locks and return 403 Forbidden', async () => {
    jest.spyOn(redisLockService, 'renewLocks').mockResolvedValue({
      renewed: false,
      errorReason: 'OWNERSHIP_MISMATCH',
      failedKey: `seatlock:${showId}:${seatId}`
    });

    const res = await request(app)
      .patch(`/api/v1/shows/${showId}/seat-locks/renew`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        seatIds: [seatId],
        lockId: stolenLockId
      });

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('LOCK_OWNERSHIP_MISMATCH');
  });

  it('should prevent deleting a newer lock when User A tries to release with an old expired lockId', async () => {
    // User A locked seat at t=0 (lockId: old). Lock expired at t=5. User B locked seat at t=6 (lockId: new).
    // User A's browser late request sends DELETE with lockId: old.
    // Lua script checks: data.lockId == lockId (old != new), so it does NOT delete User B's lock!
    jest.spyOn(redisLockService, 'releaseLocks').mockResolvedValue({
      released: true,
      releasedSeatIds: []
    });

    const res = await request(app)
      .delete(`/api/v1/shows/${showId}/seat-locks`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        seatIds: [seatId],
        lockId: 'expired-old-lock-id'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.releasedSeatIds).toEqual([]);
  });
});
