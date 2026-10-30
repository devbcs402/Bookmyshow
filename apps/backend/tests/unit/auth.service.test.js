import { jest } from '@jest/globals';
import AuthService from '../../src/modules/auth/auth.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import EmailNotificationProvider from '../../src/services/notification/email.provider.js';
import SmsNotificationProvider from '../../src/services/notification/sms.provider.js';
import { ConflictError } from '../../src/common/errors/conflict.error.js';
import { AuthenticationError } from '../../src/common/errors/authentication.error.js';
import {
  Roles,
  ApprovalStatus,
  OtpPurpose,
  OtpTargetType
} from '../../src/modules/auth/auth.constants.js';
import {
  hashPassword,
  hashSecret,
  generateRefreshToken
} from '../../src/modules/auth/auth.utils.js';

describe('Auth Service Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Customer Registration', () => {
    const registerPayload = {
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@example.com',
      mobile: '+919876543210',
      password: 'StrongPassword@123',
      ipAddress: '127.0.0.1',
      userAgent: 'JestTest'
    };

    it('should successfully register a customer and return user profile with verification flag', async () => {
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(null);
      jest.spyOn(AuthRepository, 'findUserByPhone').mockResolvedValue(null);
      jest.spyOn(AuthRepository, 'createUser').mockResolvedValue({
        _id: '65f1a2b3c4d5e6f7a8b9c0d1',
        name: registerPayload.name,
        email: registerPayload.email,
        phone: registerPayload.mobile,
        role: Roles.CUSTOMER,
        approvalStatus: ApprovalStatus.APPROVED,
        isEmailVerified: false,
        isPhoneVerified: false,
        createdAt: new Date()
      });
      jest.spyOn(AuthRepository, 'findLatestActiveOtp').mockResolvedValue(null);
      jest.spyOn(AuthRepository, 'createOtp').mockResolvedValue({});
      jest.spyOn(EmailNotificationProvider, 'sendOtpEmail').mockResolvedValue({ success: true });
      jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});

      const result = await AuthService.registerCustomer(registerPayload);

      expect(result).toBeDefined();
      expect(result.email).toBe(registerPayload.email);
      expect(result.role).toBe(Roles.CUSTOMER);
      expect(AuthRepository.createUser).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictError if email is already registered', async () => {
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue({
        _id: 'existing_id',
        email: registerPayload.email
      });

      await expect(AuthService.registerCustomer(registerPayload)).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError if mobile number is already registered', async () => {
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(null);
      jest.spyOn(AuthRepository, 'findUserByPhone').mockResolvedValue({
        _id: 'existing_id',
        phone: registerPayload.mobile
      });

      await expect(AuthService.registerCustomer(registerPayload)).rejects.toThrow(ConflictError);
    });
  });

  describe('Theatre Owner Registration', () => {
    const ownerPayload = {
      ownerName: 'PVR Multiplex Admin',
      businessEmail: 'partner@pvrcinemas.com',
      mobile: '+919876500000',
      businessName: 'PVR INOX Limited',
      businessAddress: 'Bandra West, Mumbai, MH',
      password: 'PartnerSecurePassword@123',
      ipAddress: '127.0.0.1',
      userAgent: 'JestTest'
    };

    it('should register theatre owner with PENDING_APPROVAL status and create partner entity', async () => {
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(null);
      jest.spyOn(AuthRepository, 'findUserByPhone').mockResolvedValue(null);
      jest.spyOn(AuthRepository, 'createUser').mockResolvedValue({
        _id: '65f1a2b3c4d5e6f7a8b9c0d2',
        name: ownerPayload.ownerName,
        email: ownerPayload.businessEmail,
        phone: ownerPayload.mobile,
        role: Roles.THEATRE_OWNER,
        approvalStatus: ApprovalStatus.PENDING_APPROVAL,
        createdAt: new Date()
      });
      jest.spyOn(AuthRepository, 'createTheatrePartner').mockResolvedValue({
        _id: '65f1a2b3c4d5e6f7a8b9c0d3',
        businessName: ownerPayload.businessName,
        kycStatus: 'PENDING'
      });
      jest.spyOn(AuthRepository, 'updateUser').mockResolvedValue({});
      jest.spyOn(AuthRepository, 'findLatestActiveOtp').mockResolvedValue(null);
      jest.spyOn(AuthRepository, 'createOtp').mockResolvedValue({});
      jest.spyOn(EmailNotificationProvider, 'sendOtpEmail').mockResolvedValue({ success: true });
      jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});

      const result = await AuthService.registerTheatreOwner(ownerPayload);

      expect(result).toBeDefined();
      expect(result.approvalStatus).toBe(ApprovalStatus.PENDING_APPROVAL);
      expect(result.partnerId).toBe('65f1a2b3c4d5e6f7a8b9c0d3');
      expect(AuthRepository.createTheatrePartner).toHaveBeenCalledTimes(1);
    });
  });

  describe('Login Workflow', () => {
    it('should throw AuthenticationError on non-existent identifier', async () => {
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(null);
      jest.spyOn(AuthRepository, 'findUserByPhone').mockResolvedValue(null);

      await expect(
        AuthService.login({
          identifier: 'nonexistent@example.com',
          password: 'Password@123',
          ipAddress: '127.0.0.1',
          userAgent: 'Jest'
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError on incorrect password', async () => {
      const realPasswordHash = await hashPassword('CorrectPassword@123');
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue({
        _id: 'user_123',
        email: 'user@example.com',
        passwordHash: realPasswordHash,
        isActive: true,
        role: Roles.CUSTOMER
      });

      await expect(
        AuthService.login({
          identifier: 'user@example.com',
          password: 'WrongPassword@123',
          ipAddress: '127.0.0.1',
          userAgent: 'Jest'
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError if theatre partner is pending approval', async () => {
      const realPasswordHash = await hashPassword('CorrectPassword@123');
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue({
        _id: 'partner_123',
        email: 'partner@cinema.com',
        passwordHash: realPasswordHash,
        isActive: true,
        role: Roles.THEATRE_OWNER,
        approvalStatus: ApprovalStatus.PENDING_APPROVAL
      });

      await expect(
        AuthService.login({
          identifier: 'partner@cinema.com',
          password: 'CorrectPassword@123',
          ipAddress: '127.0.0.1',
          userAgent: 'Jest'
        })
      ).rejects.toThrow(/pending Super Admin review/);
    });

    it('should issue tokens and create session on valid credentials', async () => {
      const password = 'CorrectPassword@123';
      const passwordHash = await hashPassword(password);
      const mockUser = {
        _id: '65f1a2b3c4d5e6f7a8b9c0d1',
        name: 'Valid User',
        email: 'valid@example.com',
        phone: '+919876543210',
        role: Roles.CUSTOMER,
        approvalStatus: ApprovalStatus.APPROVED,
        isActive: true,
        passwordHash
      };

      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(mockUser);
      jest.spyOn(AuthRepository, 'createSession').mockResolvedValue({
        _id: '65f1a2b3c4d5e6f7a8b9c0d2',
        userId: mockUser._id
      });
      jest.spyOn(AuthRepository, 'updateUser').mockResolvedValue({});
      jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});

      const result = await AuthService.login({
        identifier: 'valid@example.com',
        password,
        ipAddress: '127.0.0.1',
        userAgent: 'Jest'
      });

      expect(result).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.user.email).toBe(mockUser.email);
    });
  });

  describe('Refresh Token Rotation & Token Family Reuse Detection', () => {
    it('should rotate refresh token and issue new access token', async () => {
      const userId = '65f1a2b3c4d5e6f7a8b9c0d1';
      const sessionId = '65f1a2b3c4d5e6f7a8b9c0d2';
      const familyId = '65f1a2b3c4d5e6f7a8b9c0d3';

      const validRefreshToken = generateRefreshToken({ userId, sessionId, familyId });
      const currentHash = hashSecret(validRefreshToken);

      jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
        _id: sessionId,
        userId,
        familyId,
        refreshTokenHash: currentHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000)
      });
      jest.spyOn(AuthRepository, 'findUserById').mockResolvedValue({
        _id: userId,
        email: 'user@example.com',
        role: Roles.CUSTOMER,
        isActive: true
      });
      jest.spyOn(AuthRepository, 'updateSession').mockResolvedValue({});

      const result = await AuthService.refreshTokens({
        refreshToken: validRefreshToken,
        ipAddress: '127.0.0.1',
        userAgent: 'Jest'
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(AuthRepository.updateSession).toHaveBeenCalledTimes(1);
    });

    it('should detect token reuse, revoke entire token family, and throw AuthenticationError', async () => {
      const userId = '65f1a2b3c4d5e6f7a8b9c0d1';
      const sessionId = '65f1a2b3c4d5e6f7a8b9c0d2';
      const familyId = '65f1a2b3c4d5e6f7a8b9c0d3';

      const stolenOrReusedRefreshToken = generateRefreshToken({ userId, sessionId, familyId });

      // Session already revoked
      jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
        _id: sessionId,
        userId,
        familyId,
        isRevoked: true
      });
      jest.spyOn(AuthRepository, 'revokeTokenFamily').mockResolvedValue({});
      jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});

      await expect(
        AuthService.refreshTokens({
          refreshToken: stolenOrReusedRefreshToken,
          ipAddress: '127.0.0.1',
          userAgent: 'Hacker'
        })
      ).rejects.toThrow(AuthenticationError);

      expect(AuthRepository.revokeTokenFamily).toHaveBeenCalledWith(
        familyId,
        'TOKEN_FAMILY_COMPROMISE'
      );
      expect(AuthRepository.createAuditLog).toHaveBeenCalledTimes(1);
    });
  });

  describe('OTP Management', () => {
    it('should generate numeric OTP and send SMS for phone verification', async () => {
      jest.spyOn(AuthRepository, 'findLatestActiveOtp').mockResolvedValue(null);
      jest.spyOn(AuthRepository, 'createOtp').mockResolvedValue({});
      jest.spyOn(SmsNotificationProvider, 'sendOtpSms').mockResolvedValue({ success: true });
      jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});

      const res = await AuthService.sendOtp({
        target: '+919876543210',
        targetType: OtpTargetType.PHONE,
        purpose: OtpPurpose.PHONE_VERIFICATION,
        ipAddress: '127.0.0.1'
      });

      expect(res.success).toBe(true);
      expect(SmsNotificationProvider.sendOtpSms).toHaveBeenCalledTimes(1);
    });

    it('should verify correct OTP and mark it verified', async () => {
      const target = 'user@example.com';
      const purpose = OtpPurpose.EMAIL_VERIFICATION;
      const otpCode = '654321';

      jest.spyOn(AuthRepository, 'findLatestActiveOtp').mockResolvedValue({
        _id: 'otp_id',
        target,
        purpose,
        otpHash: hashSecret(otpCode),
        attempts: 1,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 100000),
        isVerified: false
      });
      jest.spyOn(AuthRepository, 'incrementOtpAttempts').mockResolvedValue({});
      jest.spyOn(AuthRepository, 'markOtpVerified').mockResolvedValue({});
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue({
        _id: 'user_123',
        email: target
      });
      jest.spyOn(AuthRepository, 'updateUser').mockResolvedValue({});

      const res = await AuthService.verifyOtp({
        target,
        purpose,
        otp: otpCode
      });

      expect(res.verified).toBe(true);
      expect(AuthRepository.markOtpVerified).toHaveBeenCalledWith('otp_id');
    });
  });

  describe('Password Recovery', () => {
    it('should return generic success message for forgot password even when user not found', async () => {
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(null);
      jest.spyOn(AuthRepository, 'findUserByPhone').mockResolvedValue(null);

      const res = await AuthService.forgotPassword({
        identifier: 'nonexistent@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest'
      });

      expect(res.message).toContain('password reset instructions have been dispatched');
    });
  });
});
