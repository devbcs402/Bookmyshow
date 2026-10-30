import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import TheatreService from '../../src/modules/theatres/theatre.service.js';
import BranchService from '../../src/modules/theatres/branch/branch.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import { NotFoundError } from '../../src/common/errors/not-found.error.js';
import ErrorCodes from '../../src/common/constants/error-codes.js';

describe('Theatre Multi-Tenant Isolation & BOLA/IDOR Security Tests', () => {
  let app;
  let ownerAToken;
  let ownerBToken;

  const mockOwnerAId = '65f1a2b3c4d5e6f7a8b9c0a1';
  const mockPartnerAId = '65f1a2b3c4d5e6f7a8b9c0aa';

  const mockOwnerBId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockPartnerBId = '65f1a2b3c4d5e6f7a8b9c0bb';

  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0s1';
  const mockTheatreBId = '65f1a2b3c4d5e6f7a8b9c0t2'; // Belongs to Owner B

  beforeAll(() => {
    app = createApp();

    ownerAToken = generateAccessToken({
      userId: mockOwnerAId,
      sessionId: mockSessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: mockPartnerAId
    });

    ownerBToken = generateAccessToken({
      userId: mockOwnerBId,
      sessionId: mockSessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: mockPartnerBId
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: mockSessionId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(userId => {
      if (userId === mockOwnerAId) {
        return Promise.resolve({
          _id: mockOwnerAId,
          role: Roles.THEATRE_OWNER,
          partnerId: mockPartnerAId,
          isActive: true
        });
      }
      return Promise.resolve({
        _id: mockOwnerBId,
        role: Roles.THEATRE_OWNER,
        partnerId: mockPartnerBId,
        isActive: true
      });
    });

    jest.spyOn(AuthRepository, 'touchSession').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Owner A cannot view Owner B theatre details (BOLA/IDOR defense)', async () => {
    jest
      .spyOn(TheatreService, 'getTheatreByIdForOwner')
      .mockImplementation((_theatreId, userContext) => {
        if (userContext.partnerId !== mockPartnerBId) {
          throw new NotFoundError(
            'Theatre not found under your organization',
            ErrorCodes.THEATRE_NOT_FOUND
          );
        }
        return Promise.resolve({ _id: mockTheatreBId, partnerId: mockPartnerBId });
      });

    const res = await request(app)
      .get(`/api/v1/owner/theatres/${mockTheatreBId}`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCodes.NOT_FOUND);
  });

  it('Owner A cannot update Owner B theatre', async () => {
    jest
      .spyOn(TheatreService, 'updateTheatre')
      .mockImplementation((_theatreId, _data, userContext) => {
        if (userContext.partnerId !== mockPartnerBId) {
          throw new NotFoundError(
            'Theatre not found under your organization',
            ErrorCodes.THEATRE_NOT_FOUND
          );
        }
        return Promise.resolve({});
      });

    const res = await request(app)
      .patch(`/api/v1/owner/theatres/${mockTheatreBId}`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ name: 'Hacked Theatre Name' });

    expect(res.status).toBe(404);
  });

  it('Owner A cannot delete Owner B theatre', async () => {
    jest
      .spyOn(TheatreService, 'softDeleteTheatre')
      .mockImplementation((_theatreId, userContext) => {
        if (userContext.partnerId !== mockPartnerBId) {
          throw new NotFoundError(
            'Theatre not found under your organization',
            ErrorCodes.THEATRE_NOT_FOUND
          );
        }
        return Promise.resolve({});
      });

    const res = await request(app)
      .delete(`/api/v1/owner/theatres/${mockTheatreBId}`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(404);
  });

  it('Owner A cannot create a branch under Owner B theatre', async () => {
    jest
      .spyOn(BranchService, 'createBranch')
      .mockImplementation((_theatreId, _data, userContext) => {
        if (userContext.partnerId !== mockPartnerBId) {
          throw new NotFoundError(
            'Parent theatre not found under your organization',
            ErrorCodes.THEATRE_NOT_FOUND
          );
        }
        return Promise.resolve({});
      });

    const branchPayload = {
      name: 'Owner A Sneaky Branch',
      contactEmail: 'sneaky@ownerA.com',
      contactPhone: '+919999999999',
      address: {
        street: 'Main Street',
        area: 'Central',
        cityId: '65f1a2b3c4d5e6f7a8b9c0f1',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400001'
      },
      location: {
        type: 'Point',
        coordinates: [72.82, 18.99]
      }
    };

    const res = await request(app)
      .post(`/api/v1/owner/theatres/${mockTheatreBId}/branches`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send(branchPayload);

    expect(res.status).toBe(404);
  });

  it('Owner B can access their own theatre successfully with 200 OK', async () => {
    jest
      .spyOn(TheatreService, 'getTheatreByIdForOwner')
      .mockImplementation((_theatreId, userContext) => {
        if (userContext.partnerId !== mockPartnerBId) {
          throw new NotFoundError(
            'Theatre not found under your organization',
            ErrorCodes.THEATRE_NOT_FOUND
          );
        }
        return Promise.resolve({
          _id: mockTheatreBId,
          partnerId: mockPartnerBId,
          name: 'Owner B Theatre'
        });
      });

    const res = await request(app)
      .get(`/api/v1/owner/theatres/${mockTheatreBId}`)
      .set('Authorization', `Bearer ${ownerBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(mockTheatreBId);
  });
});
