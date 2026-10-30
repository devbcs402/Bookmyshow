export const Roles = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  THEATRE_OWNER: 'THEATRE_OWNER',
  THEATRE_MANAGER: 'THEATRE_MANAGER',
  THEATRE_STAFF: 'THEATRE_STAFF',
  SUPER_ADMIN: 'SUPER_ADMIN'
});

export const Permissions = Object.freeze({
  // User Governance
  USER_READ: 'USER_READ',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_MANAGE: 'USER_MANAGE',

  // Movies Catalog
  MOVIE_READ: 'MOVIE_READ',
  MOVIE_CREATE: 'MOVIE_CREATE',
  MOVIE_UPDATE: 'MOVIE_UPDATE',
  MOVIE_DELETE: 'MOVIE_DELETE',

  // Theatre & Screen Management
  THEATRE_READ: 'THEATRE_READ',
  THEATRE_CREATE: 'THEATRE_CREATE',
  THEATRE_UPDATE: 'THEATRE_UPDATE',
  THEATRE_DELETE: 'THEATRE_DELETE',
  SCREEN_MANAGE: 'SCREEN_MANAGE',

  // Show Scheduling
  SHOW_READ: 'SHOW_READ',
  SHOW_CREATE: 'SHOW_CREATE',
  SHOW_UPDATE: 'SHOW_UPDATE',
  SHOW_DELETE: 'SHOW_DELETE',

  // Bookings & Inventory
  BOOKING_READ: 'BOOKING_READ',
  BOOKING_MANAGE: 'BOOKING_MANAGE',
  BOOKING_CANCEL: 'BOOKING_CANCEL',

  // Financials & Settlements
  PAYMENT_READ: 'PAYMENT_READ',
  REFUND_MANAGE: 'REFUND_MANAGE',
  REPORT_READ: 'REPORT_READ',

  // Staff & Administration
  STAFF_MANAGE: 'STAFF_MANAGE',
  ROLE_MANAGE: 'ROLE_MANAGE',
  PERMISSION_MANAGE: 'PERMISSION_MANAGE',

  // Partner KYC & Verification
  PARTNER_APPROVE: 'PARTNER_APPROVE'
});

/**
 * Standard Role-Permission Mapping Matrix
 */
export const RolePermissions = Object.freeze({
  [Roles.CUSTOMER]: [
    Permissions.USER_READ,
    Permissions.USER_UPDATE,
    Permissions.MOVIE_READ,
    Permissions.THEATRE_READ,
    Permissions.SHOW_READ,
    Permissions.BOOKING_READ,
    Permissions.BOOKING_CANCEL
  ],
  [Roles.THEATRE_STAFF]: [
    Permissions.USER_READ,
    Permissions.MOVIE_READ,
    Permissions.THEATRE_READ,
    Permissions.SHOW_READ,
    Permissions.BOOKING_READ,
    Permissions.BOOKING_MANAGE
  ],
  [Roles.THEATRE_MANAGER]: [
    Permissions.USER_READ,
    Permissions.MOVIE_READ,
    Permissions.THEATRE_READ,
    Permissions.THEATRE_UPDATE,
    Permissions.SCREEN_MANAGE,
    Permissions.SHOW_READ,
    Permissions.SHOW_CREATE,
    Permissions.SHOW_UPDATE,
    Permissions.SHOW_DELETE,
    Permissions.BOOKING_READ,
    Permissions.BOOKING_MANAGE,
    Permissions.REPORT_READ,
    Permissions.STAFF_MANAGE
  ],
  [Roles.THEATRE_OWNER]: [
    Permissions.USER_READ,
    Permissions.USER_UPDATE,
    Permissions.MOVIE_READ,
    Permissions.THEATRE_READ,
    Permissions.THEATRE_CREATE,
    Permissions.THEATRE_UPDATE,
    Permissions.THEATRE_DELETE,
    Permissions.SCREEN_MANAGE,
    Permissions.SHOW_READ,
    Permissions.SHOW_CREATE,
    Permissions.SHOW_UPDATE,
    Permissions.SHOW_DELETE,
    Permissions.BOOKING_READ,
    Permissions.BOOKING_MANAGE,
    Permissions.PAYMENT_READ,
    Permissions.REPORT_READ,
    Permissions.STAFF_MANAGE
  ],
  [Roles.SUPER_ADMIN]: Object.values(Permissions)
});

export const ApprovalStatus = Object.freeze({
  APPROVED: 'APPROVED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  REJECTED: 'REJECTED'
});

export const OtpPurpose = Object.freeze({
  REGISTRATION: 'REGISTRATION',
  LOGIN: 'LOGIN',
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PHONE_VERIFICATION: 'PHONE_VERIFICATION'
});

export const OtpTargetType = Object.freeze({
  EMAIL: 'EMAIL',
  PHONE: 'PHONE'
});

export default {
  Roles,
  Permissions,
  RolePermissions,
  ApprovalStatus,
  OtpPurpose,
  OtpTargetType
};

