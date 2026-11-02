import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import AuditLogRepository from '../../src/modules/audit-logs/audit-log.repository.js';
import { AuditLog } from '../../src/modules/auth/model/audit-log.model.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Audit Logs Integration Tests', () => {
  let app;
  let superAdminToken;
  let ownerToken;
  let customerToken;

  const mockAdminId = '65f1a2b3c4d5e6f7a8b9c0a1';
  const mockOwnerId = '65f1a2b3c4d5e6f7a8b9c0o1';
  const mockCustomerId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0p1';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0s1';
  const mockLogId = '65f1a2b3c4d5e6f7a8b9c099';

  beforeAll(() => {
    app = createApp();

    superAdminToken = generateAccessToken({
      userId: mockAdminId,
      sessionId: mockSessionId,
      role: Roles.SUPER_ADMIN,
      partnerId: null
    });

    ownerToken = generateAccessToken({
      userId: mockOwnerId,
      sessionId: mockSessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: mockPartnerId
    });

    customerToken = generateAccessToken({
      userId: mockCustomerId,
      sessionId: mockSessionId,
      role: Roles.CUSTOMER,
      partnerId: null
    });
  });

  beforeEach(() => {
    jest.restoreAllMocks();

    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: mockSessionId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(userId => {
      if (userId === mockAdminId) {
        return Promise.resolve({
          _id: mockAdminId,
          role: Roles.SUPER_ADMIN,
          isActive: true
        });
      }
      if (userId === mockOwnerId) {
        return Promise.resolve({
          _id: mockOwnerId,
          role: Roles.THEATRE_OWNER,
          partnerId: mockPartnerId,
          isActive: true
        });
      }
      if (userId === mockCustomerId) {
        return Promise.resolve({
          _id: mockCustomerId,
          role: Roles.CUSTOMER,
          isActive: true
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('GET /api/v1/admin/audit-logs', () => {
    it('should return 200 OK with paginated audit logs for SUPER_ADMIN', async () => {
      const mockResult = {
        logs: [
          {
            _id: mockLogId,
            actorId: { _id: mockAdminId, name: 'Root Admin', role: Roles.SUPER_ADMIN },
            actorRole: Roles.SUPER_ADMIN,
            action: 'THEATRE_APPROVED',
            targetResource: 'theatres',
            targetId: '65f1a2b3c4d5e6f7a8b9c0e1',
            timestamp: new Date().toISOString()
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      jest.spyOn(AuditLogRepository, 'findLogs').mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/admin/audit-logs?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.total).toBe(1);
    });

    it('should filter audit logs by action and targetResource', async () => {
      jest.spyOn(AuditLogRepository, 'findLogs').mockImplementation(filters => {
        expect(filters.action).toBe('THEATRE_APPROVED');
        expect(filters.targetResource).toBe('theatres');
        return Promise.resolve({
          logs: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        });
      });

      const response = await request(app)
        .get('/api/v1/admin/audit-logs?action=THEATRE_APPROVED&targetResource=theatres')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject access with 403 Forbidden for CUSTOMER role', async () => {
      const response = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject access with 403 Forbidden for THEATRE_OWNER role', async () => {
      const response = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const response = await request(app).get('/api/v1/admin/audit-logs');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/audit-logs/:auditLogId', () => {
    it('should return audit log details for a valid log ID', async () => {
      jest.spyOn(AuditLogRepository, 'findById').mockResolvedValue({
        _id: mockLogId,
        action: 'THEATRE_APPROVED',
        targetResource: 'theatres',
        targetId: '65f1a2b3c4d5e6f7a8b9c0e1'
      });

      const response = await request(app)
        .get(`/api/v1/admin/audit-logs/${mockLogId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(mockLogId);
      expect(response.body.data.action).toBe('THEATRE_APPROVED');
    });

    it('should return 404 Not Found for non-existent audit log ID', async () => {
      jest.spyOn(AuditLogRepository, 'findById').mockResolvedValue(null);

      const nonExistentId = '65f1a2b3c4d5e6f7a8b9c098';
      const response = await request(app)
        .get(`/api/v1/admin/audit-logs/${nonExistentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('Immutability Guarantee', () => {
    it('should throw an error when attempting to update an audit log record', async () => {
      await expect(
        AuditLog.updateOne({ _id: mockLogId }, { action: 'MUTATED' }).exec()
      ).rejects.toThrow('IMMUTABLE_AUDIT_LOG');
    });

    it('should throw an error when attempting to delete an audit log record', async () => {
      await expect(AuditLog.deleteOne({ _id: mockLogId }).exec()).rejects.toThrow(
        'IMMUTABLE_AUDIT_LOG'
      );
    });
  });
});
