import { jest } from '@jest/globals';
import UsersService from '../../src/modules/users/users.service.js';
import UsersRepository from '../../src/modules/users/users.repository.js';
import { NotFoundError } from '../../src/common/errors/not-found.error.js';
import { Roles, ApprovalStatus } from '../../src/modules/auth/auth.constants.js';

describe('Users Service Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockUser = {
    _id: '65f1a2b3c4d5e6f7a8b9c0d1',
    name: 'Ananya Sharma',
    email: 'ananya.sharma@example.com',
    phone: '+919876543210',
    role: Roles.CUSTOMER,
    partnerId: null,
    approvalStatus: ApprovalStatus.APPROVED,
    isEmailVerified: true,
    isPhoneVerified: false,
    cityId: '65f1a2b3c4d5e6f7a8b9c0d9',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('getProfile', () => {
    it('should return sanitized user profile', async () => {
      jest.spyOn(UsersRepository, 'findById').mockResolvedValue(mockUser);

      const profile = await UsersService.getProfile(mockUser._id);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(mockUser._id);
      expect(profile.email).toBe(mockUser.email);
      expect(profile.passwordHash).toBeUndefined();
    });

    it('should throw NotFoundError if user does not exist', async () => {
      jest.spyOn(UsersRepository, 'findById').mockResolvedValue(null);

      await expect(UsersService.getProfile('non_existent_id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should only update whitelisted profile fields', async () => {
      const updateData = {
        name: 'Ananya Verma',
        cityId: '65f1a2b3c4d5e6f7a8b9c0d8',
        role: Roles.SUPER_ADMIN // Attacker attempts privilege escalation
      };

      const updatedUser = {
        ...mockUser,
        name: 'Ananya Verma',
        cityId: '65f1a2b3c4d5e6f7a8b9c0d8'
      };

      jest.spyOn(UsersRepository, 'updateProfile').mockResolvedValue(updatedUser);

      const result = await UsersService.updateProfile(mockUser._id, updateData);

      expect(result.name).toBe('Ananya Verma');
      expect(result.role).toBe(Roles.CUSTOMER); // Role remains CUSTOMER
      expect(UsersRepository.updateProfile).toHaveBeenCalledWith(
        mockUser._id,
        expect.not.objectContaining({ role: Roles.SUPER_ADMIN })
      );
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account and revoke all sessions', async () => {
      jest.spyOn(UsersRepository, 'deactivateAccount').mockResolvedValue(mockUser);
      jest.spyOn(UsersRepository, 'revokeAllSessions').mockResolvedValue({ modifiedCount: 3 });

      const res = await UsersService.deactivateAccount(mockUser._id);

      expect(res.message).toContain('deactivated successfully');
      expect(UsersRepository.revokeAllSessions).toHaveBeenCalledWith(mockUser._id);
    });
  });

  describe('Active Sessions', () => {
    const mockSessions = [
      {
        _id: 'session_1',
        userAgent: 'Chrome / Windows',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 100000)
      },
      {
        _id: 'session_2',
        userAgent: 'Mobile App / Android',
        ipAddress: '10.0.0.1',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 100000)
      }
    ];

    it('should list sessions and flag the current session', async () => {
      jest.spyOn(UsersRepository, 'findActiveSessions').mockResolvedValue(mockSessions);

      const sessions = await UsersService.getActiveSessions(mockUser._id, 'session_1');

      expect(sessions).toHaveLength(2);
      expect(sessions[0].isCurrent).toBe(true);
      expect(sessions[1].isCurrent).toBe(false);
    });

    it('should revoke a single session', async () => {
      jest.spyOn(UsersRepository, 'revokeSession').mockResolvedValue({ _id: 'session_2' });

      const res = await UsersService.revokeSession(mockUser._id, 'session_2');
      expect(res.message).toContain('revoked successfully');
    });

    it('should revoke all other sessions except current', async () => {
      jest
        .spyOn(UsersRepository, 'revokeAllSessionsExceptCurrent')
        .mockResolvedValue({ modifiedCount: 2 });

      const res = await UsersService.revokeAllOtherSessions(mockUser._id, 'session_1');
      expect(res.message).toContain('All other active sessions have been revoked');
      expect(UsersRepository.revokeAllSessionsExceptCurrent).toHaveBeenCalledWith(
        mockUser._id,
        'session_1'
      );
    });
  });
});
