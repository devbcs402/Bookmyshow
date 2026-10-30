import { AuthenticationError } from '../common/errors/authentication.error.js';
import { AuthorizationError } from '../common/errors/authorization.error.js';
import ErrorCodes from '../common/constants/error-codes.js';
import { verifyAccessToken } from '../modules/auth/auth.utils.js';
import AuthRepository from '../modules/auth/auth.repository.js';
import { Roles, RolePermissions } from '../modules/auth/auth.constants.js';

/**
 * Authentication Middleware
 * Validates Bearer access token from Authorization header or HttpOnly cookie.
 * Verifies active session state in the database and populates req.user.
 */
export const authenticate = async (req, _res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(
        new AuthenticationError(
          'Authentication required: No access token provided in request',
          ErrorCodes.UNAUTHORIZED
        )
      );
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AuthenticationError('Access token has expired', ErrorCodes.TOKEN_EXPIRED));
      }
      return next(new AuthenticationError('Invalid access token', ErrorCodes.TOKEN_INVALID));
    }

    if (payload.type !== 'ACCESS_TOKEN') {
      return next(
        new AuthenticationError('Invalid token type for authorization', ErrorCodes.TOKEN_INVALID)
      );
    }

    // Verify session validity in database
    const session = await AuthRepository.findSessionById(payload.sid);
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      return next(
        new AuthenticationError(
          'Session has expired or been revoked. Please log in again.',
          ErrorCodes.TOKEN_REVOKED
        )
      );
    }

    // Verify user status in database
    const user = await AuthRepository.findUserById(payload.sub);
    if (!user || !user.isActive || user.deletedAt) {
      return next(
        new AuthenticationError('User account is disabled or deactivated', ErrorCodes.UNAUTHORIZED)
      );
    }

    // Hydrate standard user context
    req.user = {
      id: String(user._id),
      email: user.email,
      role: user.role,
      partnerId: user.partnerId ? String(user.partnerId) : null,
      sessionId: String(session._id),
      permissions: RolePermissions[user.role] || []
    };

    // Asynchronously touch session activity without blocking request
    AuthRepository.touchSession(session._id).catch(() => {});

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to users having one of the specified roles.
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('User is not authenticated', ErrorCodes.UNAUTHORIZED));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          `Access forbidden: Role '${req.user.role}' lacks required permissions`,
          ErrorCodes.INSUFFICIENT_PERMISSIONS
        )
      );
    }

    return next();
  };
};

export const authorize = authorizeRoles;

/**
 * Fine-Grained Permission Middleware
 * Restricts access to users whose role grants the specific permission.
 * Super Admin implicitly has all permissions.
 */
export const authorizePermission = permission => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('User is not authenticated', ErrorCodes.UNAUTHORIZED));
    }

    if (req.user.role === Roles.SUPER_ADMIN) {
      return next();
    }

    const userPermissions = req.user.permissions || RolePermissions[req.user.role] || [];
    if (!userPermissions.includes(permission)) {
      return next(
        new AuthorizationError(
          `Access forbidden: Missing required permission '${permission}'`,
          ErrorCodes.INSUFFICIENT_PERMISSIONS
        )
      );
    }

    return next();
  };
};

/**
 * Multi-Tenant Data Isolation Guard Middleware
 * Enforces strict boundary isolation for theatre partners.
 * Ensures theatre partners can only access data belonging to their partnerId.
 * Super Admin bypasses tenant isolation for cross-theatre administration.
 *
 * @param {Function|string} partnerIdExtractor - Function (req) => partnerId or dot-path string
 */
export const requireTenantScope = (partnerIdExtractor = 'params.partnerId') => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('User is not authenticated', ErrorCodes.UNAUTHORIZED));
    }

    // Super Admin has global scope
    if (req.user.role === Roles.SUPER_ADMIN) {
      return next();
    }

    // Tenant users must have an associated partnerId
    if (!req.user.partnerId) {
      return next(
        new AuthorizationError(
          'Access forbidden: User is not associated with an approved theatre partner organization',
          ErrorCodes.TENANT_ACCESS_DENIED
        )
      );
    }

    let targetPartnerId = null;
    if (typeof partnerIdExtractor === 'function') {
      targetPartnerId = partnerIdExtractor(req);
    } else if (typeof partnerIdExtractor === 'string') {
      const parts = partnerIdExtractor.split('.');
      let current = req;
      for (const part of parts) {
        current = current?.[part];
      }
      targetPartnerId = current;
    }

    // If a target partner ID was specified in request, it must match the authenticated tenant's partnerId
    if (targetPartnerId && String(targetPartnerId) !== String(req.user.partnerId)) {
      return next(
        new AuthorizationError(
          'Access denied: Cross-tenant resource access is strictly prohibited',
          ErrorCodes.TENANT_ACCESS_DENIED
        )
      );
    }

    // Inject verified partnerId into req for downstream query filtering
    req.tenantPartnerId = req.user.partnerId;

    return next();
  };
};

export default {
  authenticate,
  authorize,
  authorizeRoles,
  authorizePermission,
  requireTenantScope
};
