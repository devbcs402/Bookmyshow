import { User } from '../users/model/user.model.js';
import { Session } from './model/session.model.js';
import { OtpVerification } from './model/otp.model.js';
import { TheatrePartner } from './model/theatre-partner.model.js';
import { AuditLog } from './model/audit-log.model.js';

export class AuthRepository {
  // User Data Access
  static async createUser(userData, session = null) {
    const user = new User(userData);
    return user.save({ session });
  }

  static async findUserByEmail(email, selectPassword = false) {
    const query = User.findOne({ email: email.toLowerCase(), deletedAt: null });
    if (selectPassword) {
      query.select('+passwordHash');
    }
    return query.exec();
  }

  static async findUserByPhone(phone, selectPassword = false) {
    const query = User.findOne({ phone, deletedAt: null });
    if (selectPassword) {
      query.select('+passwordHash');
    }
    return query.exec();
  }

  static async findUserById(userId, selectPassword = false) {
    const query = User.findById(userId);
    if (selectPassword) {
      query.select('+passwordHash');
    }
    return query.exec();
  }

  static async updateUser(userId, updateData, session = null) {
    return User.findByIdAndUpdate(userId, updateData, { new: true, session }).exec();
  }

  // Session Data Access
  static async createSession(sessionData, session = null) {
    const newSession = new Session(sessionData);
    return newSession.save({ session });
  }

  static async findSessionById(sessionId) {
    return Session.findById(sessionId).exec();
  }

  static async touchSession(sessionId) {
    return Session.findByIdAndUpdate(sessionId, { lastActivityAt: new Date() }).exec();
  }

  static async findSessionByHash(refreshTokenHash) {
    return Session.findOne({ refreshTokenHash, isRevoked: false }).exec();
  }

  static async updateSession(sessionId, updateData, session = null) {
    return Session.findByIdAndUpdate(sessionId, updateData, { new: true, session }).exec();
  }

  static async revokeSession(sessionId, reason = 'LOGOUT') {
    return Session.findByIdAndUpdate(
      sessionId,
      { isRevoked: true, revocationReason: reason },
      { new: true }
    ).exec();
  }

  static async revokeAllUserSessions(userId, reason = 'LOGOUT_ALL') {
    return Session.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true, revocationReason: reason }
    ).exec();
  }

  static async revokeAllUserSessionsExceptCurrent(
    userId,
    currentSessionId,
    reason = 'PASSWORD_CHANGED'
  ) {
    return Session.updateMany(
      { userId, _id: { $ne: currentSessionId }, isRevoked: false },
      { isRevoked: true, revocationReason: reason }
    ).exec();
  }

  static async revokeTokenFamily(familyId, reason = 'TOKEN_FAMILY_COMPROMISE') {
    return Session.updateMany(
      { familyId, isRevoked: false },
      { isRevoked: true, revocationReason: reason }
    ).exec();
  }

  static async findActiveSessionsByUserId(userId) {
    return Session.find({ userId, isRevoked: false })
      .select('_id userAgent ipAddress createdAt lastActivityAt expiresAt')
      .sort({ lastActivityAt: -1 })
      .lean();
  }

  // OTP Data Access
  static async createOtp(otpData) {
    return OtpVerification.create(otpData);
  }

  static async findLatestActiveOtp(target, purpose) {
    return OtpVerification.findOne({
      target: target.toLowerCase(),
      purpose,
      isVerified: false,
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  static async incrementOtpAttempts(otpId) {
    return OtpVerification.findByIdAndUpdate(
      otpId,
      { $inc: { attempts: 1 } },
      { new: true }
    ).exec();
  }

  static async markOtpVerified(otpId) {
    return OtpVerification.findByIdAndUpdate(otpId, { isVerified: true }, { new: true }).exec();
  }

  // Theatre Partner Onboarding
  static async createTheatrePartner(partnerData, session = null) {
    const partner = new TheatrePartner(partnerData);
    return partner.save({ session });
  }

  static async findTheatrePartnerByOwnerId(ownerUserId) {
    return TheatrePartner.findOne({ ownerUserId }).exec();
  }

  // Audit Logging
  static async createAuditLog({
    actorId,
    actorRole,
    action,
    targetResource,
    targetId,
    ipAddress,
    userAgent,
    details
  }) {
    try {
      return await AuditLog.create({
        actorId,
        actorRole,
        action,
        targetResource,
        targetId: String(targetId || ''),
        ipAddress,
        userAgent,
        details
      });
    } catch (_err) {
      // Fire-and-forget; never crash primary transaction if secondary audit fails
      return null;
    }
  }
}

export default AuthRepository;
