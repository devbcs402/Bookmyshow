import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import ScreenRepository from '../../src/modules/screens/screen.repository.js';
import TheatreRepository from '../../src/modules/theatres/theatre.repository.js';
import SeatCategoryRepository from '../../src/modules/screens/seat-category/seat-category.repository.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Screen Multi-Tenant Isolation & BOLA Protection', () => {
  let app;
  let ownerAToken;
  let ownerBToken;

  const ownerAId = '65f1a2b3c4d5e6f7a8b9c0a1';
  const partnerAId = '65f1a2b3c4d5e6f7a8b9c0a2';
  const ownerBId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const partnerBId = '65f1a2b3c4d5e6f7a8b9c0b2';

  const theatreBId = '65f1a2b3c4d5e6f7a8b9c0t2';
  const screenBId = '65f1a2b3c4d5e6f7a8b9c0s2';
  const categoryBId = '65f1a2b3c4d5e6f7a8b9c0c2';
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

    // Mock Theatre B owned by Partner B
    jest.spyOn(TheatreRepository, 'findById').mockImplementation(id => {
      if (id === theatreBId) {
        return Promise.resolve({
          _id: theatreBId,
          name: "Owner B's Multiplex",
          partnerId: partnerBId
        });
      }
      return Promise.resolve(null);
    });

    // Mock Screen B owned by Partner B
    jest.spyOn(ScreenRepository, 'findById').mockImplementation(id => {
      if (id === screenBId) {
        return Promise.resolve({
          _id: screenBId,
          theatreId: theatreBId,
          partnerId: partnerBId,
          screenNumber: 1,
          name: "Owner B's Screen 1"
        });
      }
      return Promise.resolve(null);
    });

    // Mock Category B owned by Partner B
    jest.spyOn(SeatCategoryRepository, 'findById').mockImplementation(id => {
      if (id === categoryBId) {
        return Promise.resolve({
          _id: categoryBId,
          name: "Owner B's Premium",
          code: 'OWNER_B_PREMIUM',
          partnerId: partnerBId
        });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Owner A cannot create a screen under Owner B theatre (returns 404)', async () => {
    const res = await request(app)
      .post(`/api/v1/owner/theatres/${theatreBId}/screens`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Infiltrator Screen',
        screenNumber: 9,
        screenType: 'STANDARD'
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('Owner A cannot view Owner B screen details (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/owner/screens/${screenBId}`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('Owner A cannot update Owner B screen (returns 404)', async () => {
    const res = await request(app)
      .patch(`/api/v1/owner/screens/${screenBId}`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Hacked Screen Name'
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('Owner A cannot delete Owner B screen (returns 404)', async () => {
    const res = await request(app)
      .delete(`/api/v1/owner/screens/${screenBId}`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('Owner A cannot view or edit Owner B seating layout (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/owner/screens/${screenBId}/layout`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('Owner A cannot view Owner B physical seats (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/owner/screens/${screenBId}/seats`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('Owner B can successfully view their own screen (200 OK)', async () => {
    const res = await request(app)
      .get(`/api/v1/owner/screens/${screenBId}`)
      .set('Authorization', `Bearer ${ownerBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(screenBId);
  });
});
