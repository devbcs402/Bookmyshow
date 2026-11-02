import { z } from 'zod';
import { OtpPurpose, OtpTargetType } from './auth.constants.js';

// Regex for strong password: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,64}$/;

// Regex for standard Indian 10-digit mobile number with optional +91 or 0 prefix
const INDIAN_PHONE_REGEX = /^(\+91|0)?[6-9]\d{9}$/;

export const registerValidation = {
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name cannot exceed 100 characters'),
      email: z.string().trim().email('Invalid email address format'),
      mobile: z
        .string()
        .trim()
        .regex(
          INDIAN_PHONE_REGEX,
          'Invalid Indian mobile number (+91XXXXXXXXXX or 10 digits starting with 6-9)'
        ),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(64, 'Password cannot exceed 64 characters')
        .regex(
          PASSWORD_REGEX,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
      confirmPassword: z.string().min(1, 'Confirm password is required'),
      acceptedTerms: z.boolean().refine(val => val === true, {
        message: 'You must accept the terms and conditions'
      })
    })
    .refine(data => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword']
    })
};

export const theatreOwnerRegisterValidation = {
  body: z
    .object({
      ownerName: z.string().trim().min(2, 'Owner name must be at least 2 characters').max(100),
      businessEmail: z.string().trim().email('Invalid business email address format'),
      mobile: z.string().trim().regex(INDIAN_PHONE_REGEX, 'Invalid mobile number format'),
      businessName: z
        .string()
        .trim()
        .min(3, 'Business name must be at least 3 characters')
        .max(200),
      businessAddress: z
        .string()
        .trim()
        .min(5, 'Business address must be at least 5 characters')
        .max(500),
      gstin: z.string().trim().optional(),
      pan: z.string().trim().optional(),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(64)
        .regex(
          PASSWORD_REGEX,
          'Password must include uppercase, lowercase, number, and special character'
        ),
      confirmPassword: z.string().min(1, 'Confirm password is required'),
      acceptedTerms: z.boolean().refine(val => val === true, {
        message: 'You must accept the partner terms and conditions'
      })
    })
    .refine(data => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword']
    })
};

export const loginValidation = {
  body: z.object({
    identifier: z.string().trim().min(1, 'Email or mobile number is required'),
    password: z.string().min(1, 'Password is required')
  })
};

export const refreshTokenValidation = {
  body: z
    .object({
      refreshToken: z.string().optional()
    })
    .optional()
};

export const sendOtpValidation = {
  body: z.object({
    target: z.string().trim().min(3, 'Target email or mobile number is required'),
    targetType: z.enum([OtpTargetType.EMAIL, OtpTargetType.PHONE]),
    purpose: z.enum([
      OtpPurpose.REGISTRATION,
      OtpPurpose.LOGIN,
      OtpPurpose.PASSWORD_RESET,
      OtpPurpose.EMAIL_VERIFICATION,
      OtpPurpose.PHONE_VERIFICATION
    ])
  })
};

export const verifyOtpValidation = {
  body: z.object({
    target: z.string().trim().min(3, 'Target email or mobile is required'),
    purpose: z.enum([
      OtpPurpose.REGISTRATION,
      OtpPurpose.LOGIN,
      OtpPurpose.PASSWORD_RESET,
      OtpPurpose.EMAIL_VERIFICATION,
      OtpPurpose.PHONE_VERIFICATION
    ]),
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'OTP must be exactly 6 digits')
  })
};

export const forgotPasswordValidation = {
  body: z.object({
    identifier: z.string().trim().min(1, 'Registered email or mobile is required')
  })
};

export const resetPasswordValidation = {
  body: z
    .object({
      token: z.string().min(1, 'Reset token is required'),
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(64)
        .regex(
          PASSWORD_REGEX,
          'Password must contain uppercase, lowercase, number, and special character'
        ),
      confirmPassword: z.string().min(1, 'Confirm password is required')
    })
    .refine(data => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword']
    })
};

export const changePasswordValidation = {
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(64)
        .regex(
          PASSWORD_REGEX,
          'Password must contain uppercase, lowercase, number, and special character'
        ),
      confirmPassword: z.string().min(1, 'Confirm password is required')
    })
    .refine(data => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword']
    })
};

export default {
  registerValidation,
  theatreOwnerRegisterValidation,
  loginValidation,
  refreshTokenValidation,
  sendOtpValidation,
  verifyOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation
};
