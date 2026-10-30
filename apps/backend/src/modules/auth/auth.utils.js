import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../config/env.js';

const BCRYPT_SALT_ROUNDS = 12;
const JWT_ISSUER = 'bookmyshow-auth-service';
const JWT_AUDIENCE = 'bookmyshow-client-apps';

/**
 * Hash a password using bcrypt with 12 salt rounds
 */
export const hashPassword = async password => {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

/**
 * Verify a plain text password against a stored hash
 */
export const verifyPassword = async (plainPassword, hashedPassword) => {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Hash an opaque token, OTP, or secret with SHA-256
 */
export const hashSecret = secret => {
  if (!secret) {
    return '';
  }
  return crypto.createHash('sha256').update(String(secret)).digest('hex');
};

/**
 * Generate a cryptographically secure random token (hex)
 */
export const generateSecureRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export const generateNumericOtp = () => {
  return String(crypto.randomInt(100000, 1000000));
};

/**
 * Generate short-lived Access Token (JWT)
 */
export const generateAccessToken = ({ userId, sessionId, role, partnerId = null }) => {
  const payload = {
    sub: String(userId),
    sid: String(sessionId),
    role,
    partnerId: partnerId ? String(partnerId) : null,
    type: 'ACCESS_TOKEN'
  };

  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
};

/**
 * Generate long-lived Refresh Token (JWT bound to token family & session)
 */
export const generateRefreshToken = ({ userId, sessionId, familyId }) => {
  const payload = {
    sub: String(userId),
    sid: String(sessionId),
    fid: String(familyId),
    jti: generateSecureRandomToken(16),
    type: 'REFRESH_TOKEN'
  };

  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = token => {
  return jwt.verify(token, config.JWT_ACCESS_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = token => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
};

/**
 * Normalize and clean email addresses
 */
export const normalizeEmail = email => {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
};

/**
 * Normalize Indian mobile numbers to standard E.164 (+91XXXXXXXXXX)
 * Accepts formats: "9876543210", "+919876543210", "09876543210"
 */
export const normalizeMobile = phone => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  const cleaned = phone.replace(/[\s\-()]/g, '');

  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.substring(1)}`;
  }
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  return cleaned;
};

/**
 * Cookie options for secure Refresh Token storage
 */
export const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: `${config.API_PREFIX}/auth`,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
});

export const getClearCookieOptions = () => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: `${config.API_PREFIX}/auth`
});

export default {
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
  getRefreshTokenCookieOptions,
  getClearCookieOptions
};
