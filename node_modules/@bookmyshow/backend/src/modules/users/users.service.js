import UsersRepository from './users.repository.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import ErrorCodes from '../../common/constants/error-codes.js';

export class UsersService {
  /**
   * Retrieve current user profile
   */
  static async getProfile(userId) {
    const user = await UsersRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found', ErrorCodes.NOT_FOUND);
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      partnerId: user.partnerId || null,
      approvalStatus: user.approvalStatus,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      cityId: user.cityId || null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Update profile fields (whitelisted: name, cityId)
   * Strictly prevents altering role, permissions, partnerId, or approvalStatus.
   */
  static async updateProfile(userId, updateData) {
    const safeData = {};
    if (updateData.name !== undefined) {
      safeData.name = updateData.name;
    }
    if (updateData.cityId !== undefined) {
      safeData.cityId = updateData.cityId;
    }

    const updatedUser = await UsersRepository.updateProfile(userId, safeData);
    if (!updatedUser) {
      throw new NotFoundError('User profile not found', ErrorCodes.NOT_FOUND);
    }

    return {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      partnerId: updatedUser.partnerId || null,
      approvalStatus: updatedUser.approvalStatus,
      isEmailVerified: updatedUser.isEmailVerified,
      isPhoneVerified: updatedUser.isPhoneVerified,
      cityId: updatedUser.cityId || null,
      isActive: updatedUser.isActive,
      updatedAt: updatedUser.updatedAt
    };
  }

  /**
   * View user account status
   */
  static async getAccountStatus(userId) {
    const user = await UsersRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found', ErrorCodes.NOT_FOUND);
    }

    return {
      id: user._id,
      isActive: user.isActive,
      approvalStatus: user.approvalStatus,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      role: user.role
    };
  }

  /**
   * Deactivate current user account and immediately revoke all sessions
   */
  static async deactivateAccount(userId) {
    const deactivatedUser = await UsersRepository.deactivateAccount(userId);
    if (!deactivatedUser) {
      throw new NotFoundError('User account not found', ErrorCodes.NOT_FOUND);
    }

    await UsersRepository.revokeAllSessions(userId);

    return {
      message: 'Account deactivated successfully. All active sessions have been terminated.'
    };
  }

  /**
   * Get all active sessions for current user
   */
  static async getActiveSessions(userId, currentSessionId) {
    const sessions = await UsersRepository.findActiveSessions(userId);

    return sessions.map(s => ({
      id: s._id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      expiresAt: s.expiresAt,
      isCurrent: String(s._id) === String(currentSessionId)
    }));
  }

  /**
   * Revoke a specific active session
   */
  static async revokeSession(userId, sessionId) {
    const revoked = await UsersRepository.revokeSession(userId, sessionId);
    if (!revoked) {
      throw new NotFoundError('Session not found or already revoked', ErrorCodes.NOT_FOUND);
    }

    return {
      message: 'Session revoked successfully.'
    };
  }

  /**
   * Revoke all other active sessions except the current one
   */
  static async revokeAllOtherSessions(userId, currentSessionId) {
    await UsersRepository.revokeAllSessionsExceptCurrent(userId, currentSessionId);

    return {
      message: 'All other active sessions have been revoked successfully.'
    };
  }
}

export default UsersService;
