import { Types } from 'mongoose';
import AuthRepository from './auth.repository.js';
import {
  hashPassword,
  verifyPassword,
  hashSecret,
  generateNumericOtp,
  generateSecureRandomToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  normalizeEmail,
  normalizeMobile
} from './auth.utils.js';
import { Roles, ApprovalStatus, OtpPurpose, OtpTargetType } from './auth.constants.js';
import { AuthenticationError } from '../../common/errors/authentication.error.js';
import { ValidationError } from '../../common/errors/validation.error.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import { RateLimitError } from '../../common/errors/rate-limit.error.js';
import ErrorCodes from '../../common/constants/error-codes.js';
import EmailProvider from '../../services/notification/email.provider.js';
import SmsProvider from '../../services/notification/sms.provider.js';

export class AuthService {
  /**
   * Register a retail Customer
   */
  static async registerCustomer({ name, email, mobile, password, ipAddress = '', userAgent = '' }) {
    const cleanEmail = normalizeEmail(email);
    const cleanMobile = normalizeMobile(mobile);

    // 1. Check uniqueness of email
    const existingEmail = await AuthRepository.findUserByEmail(cleanEmail);
    if (existingEmail) {
      throw new ConflictError(
        'An account with this email address already exists',
        ErrorCodes.DUPLICATE_RESOURCE
      );
    }

    // 2. Check uniqueness of mobile
    const existingPhone = await AuthRepository.findUserByPhone(cleanMobile);
    if (existingPhone) {
      throw new ConflictError(
        'An account with this mobile number already exists',
        ErrorCodes.DUPLICATE_RESOURCE
      );
    }

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Create user record with strict server-assigned CUSTOMER role
    const newUser = await AuthRepository.createUser({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanMobile,
      passwordHash,
      role: Roles.CUSTOMER,
      approvalStatus: ApprovalStatus.APPROVED,
      isEmailVerified: false,
      isPhoneVerified: false,
      isActive: true
    });

    // 5. Generate and dispatch verification OTP
    await this.sendOtp({
      target: cleanEmail,
      targetType: OtpTargetType.EMAIL,
      purpose: OtpPurpose.REGISTRATION,
      ipAddress
    });

    // 6. Record audit event
    await AuthRepository.createAuditLog({
      actorId: newUser._id,
      actorRole: Roles.CUSTOMER,
      action: 'USER_REGISTERED',
      targetResource: 'users',
      targetId: newUser._id,
      ipAddress,
      userAgent,
      details: { email: cleanEmail, phone: cleanMobile }
    });

    return {
      userId: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      isEmailVerified: newUser.isEmailVerified
    };
  }

  /**
   * Register a Theatre Owner (Pending Super Admin Approval)
   */
  static async registerTheatreOwner({
    ownerName,
    businessEmail,
    mobile,
    businessName,
    businessAddress,
    gstin = '',
    pan = '',
    password,
    ipAddress = '',
    userAgent = ''
  }) {
    const cleanEmail = normalizeEmail(businessEmail);
    const cleanMobile = normalizeMobile(mobile);

    const existingEmail = await AuthRepository.findUserByEmail(cleanEmail);
    if (existingEmail) {
      throw new ConflictError(
        'An account with this business email already exists',
        ErrorCodes.DUPLICATE_RESOURCE
      );
    }

    const existingPhone = await AuthRepository.findUserByPhone(cleanMobile);
    if (existingPhone) {
      throw new ConflictError(
        'An account with this phone number already exists',
        ErrorCodes.DUPLICATE_RESOURCE
      );
    }

    const passwordHash = await hashPassword(password);

    // 1. Create User with THEATRE_OWNER role and PENDING_APPROVAL status
    const newUser = await AuthRepository.createUser({
      name: ownerName.trim(),
      email: cleanEmail,
      phone: cleanMobile,
      passwordHash,
      role: Roles.THEATRE_OWNER,
      approvalStatus: ApprovalStatus.PENDING_APPROVAL,
      isEmailVerified: false,
      isActive: true
    });

    // 2. Create Theatre Partner Business Entity
    const partner = await AuthRepository.createTheatrePartner({
      ownerUserId: newUser._id,
      businessName: businessName.trim(),
      businessEmail: cleanEmail,
      businessPhone: cleanMobile,
      businessAddress: businessAddress.trim(),
      gstin: gstin.trim(),
      pan: pan.trim(),
      kycStatus: 'PENDING'
    });

    // 3. Bind partner ID to user
    await AuthRepository.updateUser(newUser._id, { partnerId: partner._id });

    // 4. Send verification OTP
    await this.sendOtp({
      target: cleanEmail,
      targetType: OtpTargetType.EMAIL,
      purpose: OtpPurpose.REGISTRATION,
      ipAddress
    });

    // 5. Audit Log
    await AuthRepository.createAuditLog({
      actorId: newUser._id,
      actorRole: Roles.THEATRE_OWNER,
      action: 'THEATRE_OWNER_REGISTERED',
      targetResource: 'theatre_partners',
      targetId: partner._id,
      ipAddress,
      userAgent,
      details: { businessName, email: cleanEmail }
    });

    return {
      userId: newUser._id,
      ownerName: newUser.name,
      businessEmail: newUser.email,
      businessName: partner.businessName,
      partnerId: partner._id,
      role: newUser.role,
      approvalStatus: newUser.approvalStatus
    };
  }

  /**
   * User Authentication (Login)
   */
  static async login({ identifier, password, ipAddress = '', userAgent = '' }) {
    const isEmail = identifier.includes('@');
    const cleanIdentifier = isEmail ? normalizeEmail(identifier) : normalizeMobile(identifier);

    // 1. Locate user (generic error on failure to stop enumeration)
    const user = isEmail
      ? await AuthRepository.findUserByEmail(cleanIdentifier, true)
      : await AuthRepository.findUserByPhone(cleanIdentifier, true);

    if (!user) {
      throw new AuthenticationError(
        'Invalid email/mobile or password',
        ErrorCodes.INVALID_CREDENTIALS
      );
    }

    // 2. Verify password hash
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await AuthRepository.createAuditLog({
        actorId: user._id,
        actorRole: user.role,
        action: 'LOGIN_FAILED',
        targetResource: 'users',
        targetId: user._id,
        ipAddress,
        userAgent,
        details: { reason: 'Incorrect password' }
      });
      throw new AuthenticationError(
        'Invalid email/mobile or password',
        ErrorCodes.INVALID_CREDENTIALS
      );
    }

    // 3. Status checks
    if (!user.isActive || user.deletedAt) {
      throw new AuthenticationError(
        'This account has been deactivated or disabled',
        ErrorCodes.FORBIDDEN
      );
    }

    if (user.isSuspended) {
      throw new AuthenticationError(
        'Account is suspended. Please contact customer support.',
        ErrorCodes.FORBIDDEN
      );
    }

    if (
      user.role === Roles.THEATRE_OWNER &&
      user.approvalStatus === ApprovalStatus.PENDING_APPROVAL
    ) {
      throw new AuthenticationError(
        'Theatre partner onboarding is pending Super Admin review',
        ErrorCodes.FORBIDDEN
      );
    }

    if (user.role === Roles.THEATRE_OWNER && user.approvalStatus === ApprovalStatus.REJECTED) {
      throw new AuthenticationError(
        'Theatre partner application has been rejected',
        ErrorCodes.FORBIDDEN
      );
    }

    // 4. Session & Dual Token Generation
    const sessionId = new Types.ObjectId();
    const familyId = generateSecureRandomToken(16);
    const refreshToken = generateRefreshToken({
      userId: user._id,
      sessionId,
      familyId
    });

    const refreshTokenHash = hashSecret(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await AuthRepository.createSession({
      _id: sessionId,
      userId: user._id,
      refreshTokenHash,
      familyId,
      userAgent,
      ipAddress,
      expiresAt,
      isRevoked: false
    });

    const accessToken = generateAccessToken({
      userId: user._id,
      sessionId,
      role: user.role,
      partnerId: user.partnerId
    });

    // 5. Update last login
    await AuthRepository.updateUser(user._id, { lastLoginAt: new Date() });

    // 6. Audit log
    await AuthRepository.createAuditLog({
      actorId: user._id,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      targetResource: 'user_sessions',
      targetId: sessionId,
      ipAddress,
      userAgent
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        partnerId: user.partnerId,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      },
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  /**
   * Refresh Token Rotation with Reuse Detection
   */
  static async refreshTokens({ refreshToken, ipAddress = '', userAgent = '' }) {
    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required', ErrorCodes.TOKEN_INVALID);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (_err) {
      throw new AuthenticationError(
        'Refresh token is invalid or expired',
        ErrorCodes.TOKEN_EXPIRED
      );
    }

    const { sub: userId, sid: sessionId, fid: familyId } = decoded;

    // 1. Locate session
    const session = await AuthRepository.findSessionById(sessionId);

    // 2. Token Reuse Detection
    if (!session || session.isRevoked) {
      // Security Incident: Old or revoked token presented
      await AuthRepository.revokeTokenFamily(familyId, 'TOKEN_FAMILY_COMPROMISE');
      await AuthRepository.createAuditLog({
        actorId: userId,
        actorRole: 'UNKNOWN',
        action: 'TOKEN_REUSE_DETECTED',
        targetResource: 'user_sessions',
        targetId: sessionId,
        ipAddress,
        userAgent,
        details: { familyId, reason: 'Attempted reuse of revoked session token' }
      });
      throw new AuthenticationError(
        'Security violation: Token reuse detected. All active sessions have been terminated.',
        ErrorCodes.TOKEN_REVOKED
      );
    }

    // 3. Verify exact hash match
    const incomingHash = hashSecret(refreshToken);
    if (session.refreshTokenHash !== incomingHash) {
      await AuthRepository.revokeTokenFamily(familyId, 'TOKEN_HASH_MISMATCH');
      throw new AuthenticationError(
        'Security violation: Token mismatch. Please re-authenticate.',
        ErrorCodes.TOKEN_REVOKED
      );
    }

    // 4. Check user status
    const user = await AuthRepository.findUserById(userId);
    if (!user || !user.isActive || user.isSuspended || user.deletedAt) {
      await AuthRepository.revokeSession(sessionId, 'USER_INACTIVE');
      throw new AuthenticationError('User account is inactive or disabled', ErrorCodes.FORBIDDEN);
    }

    // 5. Issue new rotating tokens
    const newRefreshToken = generateRefreshToken({
      userId: user._id,
      sessionId: session._id,
      familyId: session.familyId
    });

    const newHash = hashSecret(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Atomically rotate token
    await AuthRepository.updateSession(session._id, {
      refreshTokenHash: newHash,
      lastActivityAt: new Date(),
      expiresAt: newExpiresAt,
      ipAddress,
      userAgent
    });

    const newAccessToken = generateAccessToken({
      userId: user._id,
      sessionId: session._id,
      role: user.role,
      partnerId: user.partnerId
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        partnerId: user.partnerId
      }
    };
  }

  /**
   * Logout (Revoke current session)
   */
  static async logout({ sessionId, userId, ipAddress = '', userAgent = '' }) {
    if (sessionId) {
      await AuthRepository.revokeSession(sessionId, 'USER_LOGOUT');
    }

    await AuthRepository.createAuditLog({
      actorId: userId,
      actorRole: 'USER',
      action: 'LOGOUT_SUCCESS',
      targetResource: 'user_sessions',
      targetId: sessionId,
      ipAddress,
      userAgent
    });

    return { success: true };
  }

  /**
   * Logout All Sessions
   */
  static async logoutAll({ userId, ipAddress = '', userAgent = '' }) {
    await AuthRepository.revokeAllUserSessions(userId, 'USER_LOGOUT_ALL');

    await AuthRepository.createAuditLog({
      actorId: userId,
      actorRole: 'USER',
      action: 'LOGOUT_ALL_SUCCESS',
      targetResource: 'users',
      targetId: userId,
      ipAddress,
      userAgent
    });

    return { success: true };
  }

  /**
   * Send Cryptographically Secure OTP
   */
  static async sendOtp({ target, targetType, purpose, ipAddress = '' }) {
    const cleanTarget =
      targetType === OtpTargetType.EMAIL ? normalizeEmail(target) : normalizeMobile(target);

    // 1. Rate Limiting / Resend cooldown check
    const recentOtp = await AuthRepository.findLatestActiveOtp(cleanTarget, purpose);
    if (recentOtp && recentOtp.resendAvailableAt > new Date()) {
      const waitSeconds = Math.ceil((recentOtp.resendAvailableAt.getTime() - Date.now()) / 1000);
      throw new ConflictError(
        `Please wait ${waitSeconds} seconds before requesting a new code`,
        ErrorCodes.RATE_LIMIT_EXCEEDED
      );
    }

    // 2. Generate 6-digit OTP & Hash
    const plainOtp = generateNumericOtp();
    const otpHash = hashSecret(plainOtp);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60s cooldown

    // 3. Persist OTP
    await AuthRepository.createOtp({
      target: cleanTarget,
      targetType,
      purpose,
      otpHash,
      attempts: 0,
      maxAttempts: 5,
      isVerified: false,
      expiresAt,
      resendAvailableAt
    });

    // 4. Dispatch via Email or SMS Provider
    if (targetType === OtpTargetType.EMAIL) {
      await EmailProvider.sendOtpEmail({ to: cleanTarget, otp: plainOtp, purpose });
    } else {
      await SmsProvider.sendOtpSms({ to: cleanTarget, otp: plainOtp, purpose });
    }

    // 5. Audit log
    await AuthRepository.createAuditLog({
      actorId: null,
      actorRole: 'ANONYMOUS',
      action: 'OTP_DISPATCHED',
      targetResource: 'otp_verifications',
      targetId: cleanTarget,
      ipAddress,
      details: { purpose, targetType }
    });

    return {
      success: true,
      message: `Verification code sent to ${targetType === OtpTargetType.EMAIL ? cleanTarget : cleanTarget.replace(/(\+\d{2}\d{2})\d{4}(\d{4})/, '$1****$2')}`
    };
  }

  /**
   * Verify One-Time Password (OTP)
   */
  static async verifyOtp({ target, purpose, otp }) {
    const isEmail = target.includes('@');
    const cleanTarget = isEmail ? normalizeEmail(target) : normalizeMobile(target);

    const otpRecord = await AuthRepository.findLatestActiveOtp(cleanTarget, purpose);
    if (!otpRecord) {
      throw new ValidationError('Verification code is invalid or has expired');
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      throw new RateLimitError('Too many failed verification attempts. Please request a new code.');
    }

    const incomingHash = hashSecret(otp);
    if (otpRecord.otpHash !== incomingHash) {
      await AuthRepository.incrementOtpAttempts(otpRecord._id);
      throw new ValidationError('Invalid verification code');
    }

    // Mark verified
    await AuthRepository.markOtpVerified(otpRecord._id);

    // If purpose was registration or email verification, update user
    if (purpose === OtpPurpose.REGISTRATION || purpose === OtpPurpose.EMAIL_VERIFICATION) {
      const user = await AuthRepository.findUserByEmail(cleanTarget);
      if (user) {
        await AuthRepository.updateUser(user._id, { isEmailVerified: true });
      }
    } else if (purpose === OtpPurpose.PHONE_VERIFICATION) {
      const user = await AuthRepository.findUserByPhone(cleanTarget);
      if (user) {
        await AuthRepository.updateUser(user._id, { isPhoneVerified: true });
      }
    }

    return { success: true, verified: true };
  }

  /**
   * Forgot Password - Dispatch Reset Link / OTP
   */
  static async forgotPassword({ identifier, ipAddress = '', userAgent = '' }) {
    const isEmail = identifier.includes('@');
    const cleanIdentifier = isEmail ? normalizeEmail(identifier) : normalizeMobile(identifier);

    const user = isEmail
      ? await AuthRepository.findUserByEmail(cleanIdentifier)
      : await AuthRepository.findUserByPhone(cleanIdentifier);

    if (user && user.isActive && !user.isSuspended) {
      const resetToken = generateSecureRandomToken(32);
      const tokenHash = hashSecret(resetToken);

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      await AuthRepository.createOtp({
        target: user.email,
        targetType: OtpTargetType.EMAIL,
        purpose: OtpPurpose.PASSWORD_RESET,
        otpHash: tokenHash,
        attempts: 0,
        maxAttempts: 3,
        isVerified: false,
        expiresAt,
        resendAvailableAt: new Date(Date.now() + 60 * 1000)
      });

      await EmailProvider.sendPasswordResetEmail({ to: user.email, resetToken });

      await AuthRepository.createAuditLog({
        actorId: user._id,
        actorRole: user.role,
        action: 'PASSWORD_RESET_REQUESTED',
        targetResource: 'users',
        targetId: user._id,
        ipAddress,
        userAgent
      });
    }

    // Always return generic success message to prevent account enumeration
    return {
      success: true,
      message:
        'If an account matches that identifier, password reset instructions have been dispatched.'
    };
  }

  /**
   * Reset Password with Verified Token
   */
  static async resetPassword({ token, newPassword, ipAddress = '', userAgent = '' }) {
    const tokenHash = hashSecret(token);
    const resetRecord = await AuthRepository.findLatestActiveOtp('', OtpPurpose.PASSWORD_RESET);

    // Search reset record by hash
    const matchingRecord = resetRecord && resetRecord.otpHash === tokenHash ? resetRecord : null;
    if (!matchingRecord || matchingRecord.isVerified) {
      throw new ValidationError('Password reset link is invalid or has expired');
    }

    const user = await AuthRepository.findUserByEmail(matchingRecord.target);
    if (!user) {
      throw new ValidationError('Password reset target is invalid');
    }

    const newHash = await hashPassword(newPassword);

    // Update password & invalidate all active sessions
    await AuthRepository.updateUser(user._id, {
      passwordHash: newHash,
      passwordChangedAt: new Date()
    });
    await AuthRepository.revokeAllUserSessions(user._id, 'PASSWORD_RESET');
    await AuthRepository.markOtpVerified(matchingRecord._id);

    await AuthRepository.createAuditLog({
      actorId: user._id,
      actorRole: user.role,
      action: 'PASSWORD_RESET_SUCCESS',
      targetResource: 'users',
      targetId: user._id,
      ipAddress,
      userAgent
    });

    return {
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    };
  }

  /**
   * Change Password (Authenticated User)
   */
  static async changePassword({
    userId,
    currentPassword,
    newPassword,
    currentSessionId = null,
    ipAddress = '',
    userAgent = ''
  }) {
    const user = await AuthRepository.findUserById(userId, true);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AuthenticationError(
        'Current password is incorrect',
        ErrorCodes.INVALID_CREDENTIALS
      );
    }

    const isSame = await verifyPassword(newPassword, user.passwordHash);
    if (isSame) {
      throw new ValidationError('New password cannot be identical to your current password');
    }

    const newHash = await hashPassword(newPassword);

    await AuthRepository.updateUser(user._id, {
      passwordHash: newHash,
      passwordChangedAt: new Date()
    });

    // Revoke all sessions except current one if provided
    if (currentSessionId) {
      await AuthRepository.revokeAllUserSessionsExceptCurrent(
        user._id,
        currentSessionId,
        'PASSWORD_CHANGED'
      );
    } else {
      await AuthRepository.revokeAllUserSessions(user._id, 'PASSWORD_CHANGED');
    }

    await AuthRepository.createAuditLog({
      actorId: user._id,
      actorRole: user.role,
      action: 'PASSWORD_CHANGED',
      targetResource: 'users',
      targetId: user._id,
      ipAddress,
      userAgent
    });

    return {
      success: true,
      message: 'Password changed successfully'
    };
  }
}

export default AuthService;
