import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import BranchService from '../../src/modules/theatres/branch/branch.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Branch Endpoints Integration Tests', () => {
  let app;
  let ownerToken;

  const mockOwnerId = '65f1a2b3c4d5e6f7a8b9c0o1';
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0p1';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0s1';
  const mockTheatreId = '65f1a2b3c4d5e6f7a8b9c0t1';
  const mockBranchId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockCityId = '65f1a2b3c4d5e6f7a8b9c0c1';

  beforeAll(() => {
    app = createApp();

    ownerToken = generateAccessToken({
      userId: mockOwnerId,
      sessionId: mockSessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: mockPartnerId
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: mockSessionId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockResolvedValue({
      _id: mockOwnerId,
      role: Roles.THEATRE_OWNER,
      partnerId: mockPartnerId,
      isActive: true
    });

    jest.spyOn(AuthRepository, 'touchSession').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const validBranchPayload = {
    name: 'PVR Phoenix Palladium Audi West',
    theatreCode: 'PVR-PHX-02',
    contactEmail: 'audiwest@pvr.com',
    contactPhone: '+912224989101',
    address: {
      street: '462, Senapati Bapat Marg, West Wing',
      area: 'Lower Parel',
      cityId: mockCityId,
      state: 'Maharashtra',
      country: 'India',
      pincode: '400013'
    },
    location: {
      type: 'Point',
      coordinates: [72.8258, 18.9953]
    }
  };

  it('POST /api/v1/owner/theatres/:theatreId/branches should create branch with 201 Created', async () => {
    jest.spyOn(BranchService, 'createBranch').mockResolvedValue({
      _id: mockBranchId,
      name: 'PVR Phoenix Palladium Audi West',
      parentTheatreId: mockTheatreId,
      isBranch: true
    });

    const res = await request(app)
      .post(`/api/v1/owner/theatres/${mockTheatreId}/branches`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(validBranchPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.parentTheatreId).toBe(mockTheatreId);
  });

  it('GET /api/v1/owner/theatres/:theatreId/branches should list branches with 200 OK', async () => {
    jest
      .spyOn(BranchService, 'listBranches')
      .mockResolvedValue([{ _id: mockBranchId, name: 'PVR Phoenix Audi West' }]);

    const res = await request(app)
      .get(`/api/v1/owner/theatres/${mockTheatreId}/branches`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/v1/owner/branches/:branchId should return single branch details', async () => {
    jest.spyOn(BranchService, 'getBranchById').mockResolvedValue({
      _id: mockBranchId,
      name: 'PVR Phoenix Audi West'
    });

    const res = await request(app)
      .get(`/api/v1/owner/branches/${mockBranchId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('PVR Phoenix Audi West');
  });

  it('PATCH /api/v1/owner/branches/:branchId/status should toggle status with 200 OK', async () => {
    jest.spyOn(BranchService, 'toggleBranchStatus').mockResolvedValue({
      _id: mockBranchId,
      isActive: false
    });

    const res = await request(app)
      .patch(`/api/v1/owner/branches/${mockBranchId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('DELETE /api/v1/owner/branches/:branchId should soft delete branch with 200 OK', async () => {
    jest.spyOn(BranchService, 'deleteBranch').mockResolvedValue({});

    const res = await request(app)
      .delete(`/api/v1/owner/branches/${mockBranchId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted successfully');
  });
});
