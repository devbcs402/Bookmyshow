import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import ShowRepository from '../../src/modules/shows/show.repository.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Show Multi-Tenant Isolation & BOLA Protection', () => {
  let app;
  let ownerAToken;
  let ownerBToken;

  const ownerAId = '65f1a2b3c4d5e6f7a8b9c0a1';
  const partnerAId = '65f1a2b3c4d5e6f7a8b9c0a2';
  const ownerBId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const partnerBId = '65f1a2b3c4d5e6f7a8b9c0b2';

  const showBId = '65f1a2b3c4d5e6f7a8b9c0s2';
  const sessionId = '65f1a2b3c4d5e6f7a8b9c0e1';

  beforeAll(() => {
    app = createApp();

    ownerAToken = generateAccessToken({
      userId: ownerAId,
      sessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: partnerAId
    });

    ownerBToken = generateAccessToken({
      userId: ownerBId,
      sessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: partnerBId
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: sessionId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(userId => {
      if (userId === ownerAId) {
        return Promise.resolve({
          _id: ownerAId,
          role: Roles.THEATRE_OWNER,
          partnerId: partnerAId,
          isActive: true
        });
      }
      return Promise.resolve({
        _id: ownerBId,
        role: Roles.THEATRE_OWNER,
        partnerId: partnerBId,
        isActive: true
      });
    });

    // Mock Show B strictly owned by Partner B
    jest.spyOn(ShowRepository, 'findById').mockImplementation(id => {
      if (id === showBId) {
        return Promise.resolve({
          _id: showBId,
          partnerId: partnerBId,
          status: 'DRAFT',
          startTime: new Date('2026-11-06T18:00:00.000Z')
        });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Owner A cannot view Owner B's show details (returns 404 Not Found)", async () => {
    const res = await request(app)
      .get(`/api/v1/owner/shows/${showBId}`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("Owner A cannot update Owner B's show (returns 404 Not Found)", async () => {
    const res = await request(app)
      .patch(`/api/v1/owner/shows/${showBId}`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ audioFormat: 'Dolby Atmos' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("Owner A cannot reschedule Owner B's show (returns 404 Not Found)", async () => {
    const res = await request(app)
      .patch(`/api/v1/owner/shows/${showBId}/reschedule`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ newStartTime: '2026-11-06T20:00:00.000Z' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("Owner A cannot publish Owner B's show (returns 404 Not Found)", async () => {
    const res = await request(app)
      .post(`/api/v1/owner/shows/${showBId}/publish`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("Owner A cannot cancel Owner B's show (returns 404 Not Found)", async () => {
    const res = await request(app)
      .post(`/api/v1/owner/shows/${showBId}/cancel`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ reason: 'Malicious cancellation attempt' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("Owner A cannot update Owner B's show pricing (returns 404 Not Found)", async () => {
    const res = await request(app)
      .put(`/api/v1/owner/shows/${showBId}/pricing`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        pricingTiers: [{ categoryCode: 'REGULAR', basePrice: 10 }]
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('Owner B can successfully view their own show (returns 200 OK)', async () => {
    const res = await request(app)
      .get(`/api/v1/owner/shows/${showBId}`)
      .set('Authorization', `Bearer ${ownerBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(showBId);
  });
});
