import {
  hashPassword,
  verifyPassword,
  hashSecret,
  generateSecureRandomToken,
  generateNumericOtp,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  normalizeEmail,
  normalizeMobile,
  getRefreshTokenCookieOptions
} from '../../src/modules/auth/auth.utils.js';

describe('Auth Utils Unit Tests', () => {
  describe('Password Hashing and Verification', () => {
    it('should securely hash password with bcrypt and verify match', async () => {
      const password = 'StrongPassword@123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true);

      const isMatch = await verifyPassword(password, hash);
      expect(isMatch).toBe(true);

      const isNotMatch = await verifyPassword('WrongPassword@999', hash);
      expect(isNotMatch).toBe(false);
    });

    it('should return false for empty or null passwords', async () => {
      expect(await verifyPassword('', 'somehash')).toBe(false);
      expect(await verifyPassword(null, 'somehash')).toBe(false);
      expect(await verifyPassword('password', null)).toBe(false);
    });
  });

  describe('Secret and Token Generation', () => {
    it('should hash secrets with SHA-256', () => {
      const secret = 'refresh-token-xyz';
      const hash = hashSecret(secret);
      expect(hash).toHaveLength(64);
      expect(hashSecret(secret)).toBe(hash); // Deterministic
    });

    it('should generate secure random hex tokens of custom length', () => {
      const token1 = generateSecureRandomToken(16);
      const token2 = generateSecureRandomToken(32);
      expect(token1).toHaveLength(32);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('should generate 6-digit numeric OTPs', () => {
      for (let i = 0; i < 5; i++) {
        const otp = generateNumericOtp();
        expect(otp).toMatch(/^\d{6}$/);
        const num = parseInt(otp, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThan(1000000);
      }
    });
  });

  describe('JWT Token Lifecycle', () => {
    const payload = {
      userId: '65f1a2b3c4d5e6f7a8b9c0d1',
      sessionId: '65f1a2b3c4d5e6f7a8b9c0d2',
      role: 'CUSTOMER'
    };

    it('should generate and verify valid Access Token', () => {
      const token = generateAccessToken(payload);
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(payload.userId);
      expect(decoded.sid).toBe(payload.sessionId);
      expect(decoded.role).toBe('CUSTOMER');
      expect(decoded.type).toBe('ACCESS_TOKEN');
      expect(decoded.iss).toBe('bookmyshow-auth-service');
      expect(decoded.aud).toBe('bookmyshow-client-apps');
    });

    it('should generate and verify valid Refresh Token', () => {
      const refreshPayload = {
        userId: payload.userId,
        sessionId: payload.sessionId,
        familyId: '65f1a2b3c4d5e6f7a8b9c0d3'
      };

      const token = generateRefreshToken(refreshPayload);
      expect(typeof token).toBe('string');

      const decoded = verifyRefreshToken(token);
      expect(decoded.sub).toBe(refreshPayload.userId);
      expect(decoded.sid).toBe(refreshPayload.sessionId);
      expect(decoded.fid).toBe(refreshPayload.familyId);
      expect(decoded.type).toBe('REFRESH_TOKEN');
    });
  });

  describe('Input Normalization', () => {
    it('should normalize email addresses to lower-case trimmed string', () => {
      expect(normalizeEmail('  User.Test@Domain.COM  ')).toBe('user.test@domain.com');
      expect(normalizeEmail('')).toBe('');
      expect(normalizeEmail(null)).toBe('');
    });

    it('should normalize Indian phone numbers to E.164 +91 format', () => {
      expect(normalizeMobile('9876543210')).toBe('+919876543210');
      expect(normalizeMobile('+919876543210')).toBe('+919876543210');
      expect(normalizeMobile('09876543210')).toBe('+919876543210');
      expect(normalizeMobile('+91 98765-43210')).toBe('+919876543210');
      expect(normalizeMobile('')).toBe('');
    });
  });

  describe('Cookie Options', () => {
    it('should return secure HttpOnly cookie settings', () => {
      const opts = getRefreshTokenCookieOptions();
      expect(opts.httpOnly).toBe(true);
      expect(opts.path).toContain('/auth');
      expect(opts.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });
});

