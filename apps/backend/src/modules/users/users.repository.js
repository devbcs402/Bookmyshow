import { User } from './model/user.model.js';
import { Session } from '../auth/model/session.model.js';

export class UsersRepository {
  static async findById(userId) {
    return User.findById(userId).select('-passwordHash').exec();
  }

  static async updateProfile(userId, updateFields) {
    // Whitelist mutable fields to ensure role/partnerId/permissions cannot be tampered with
    const allowedUpdates = {};
    if (updateFields.name !== undefined) {
      allowedUpdates.name = updateFields.name.trim();
    }
    if (updateFields.cityId !== undefined) {
      allowedUpdates.cityId = updateFields.cityId;
    }

    return User.findByIdAndUpdate(userId, { $set: allowedUpdates }, { new: true })
      .select('-passwordHash')
      .exec();
  }

  static async deactivateAccount(userId) {
    return User.findByIdAndUpdate(
      userId,
      { isActive: false, deletedAt: new Date() },
      { new: true }
    ).exec();
  }

  static async reactivateAccount(userId) {
    return User.findByIdAndUpdate(
      userId,
      { isActive: true, deletedAt: null },
      { new: true }
    ).exec();
  }

  static async findActiveSessions(userId) {
    return Session.find({ userId, isRevoked: false })
      .select('_id userAgent ipAddress lastActivityAt createdAt expiresAt')
      .sort({ lastActivityAt: -1 })
      .lean();
  }

  static async revokeSession(userId, sessionId) {
    return Session.findOneAndUpdate(
      { _id: sessionId, userId, isRevoked: false },
      { isRevoked: true, revocationReason: 'USER_REVOKED_SESSION' },
      { new: true }
    ).exec();
  }

  static async revokeAllSessionsExceptCurrent(userId, currentSessionId) {
    return Session.updateMany(
      { userId, _id: { $ne: currentSessionId }, isRevoked: false },
      { isRevoked: true, revocationReason: 'REVOKE_ALL_OTHER_SESSIONS' }
    ).exec();
  }

  static async revokeAllSessions(userId) {
    return Session.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true, revocationReason: 'REVOKE_ALL_SESSIONS' }
    ).exec();
  }
}

export default UsersRepository;

