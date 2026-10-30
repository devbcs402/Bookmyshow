import { AuthenticationError } from '../common/errors/authentication.error.js';
import { AuthorizationError } from '../common/errors/authorization.error.js';
import ErrorCodes from '../common/constants/error-codes.js';

export const authenticate = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AuthenticationError(
        'Authentication required: No Bearer token provided in Authorization header',
        ErrorCodes.UNAUTHORIZED
      )
    );
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(
      new AuthenticationError('Invalid authorization token format', ErrorCodes.TOKEN_INVALID)
    );
  }

  // Note: Full JWT signature validation and user hydration will be wired in Part 4.
  // Here we prepare the standard middleware contract.
  req.user = {
    id: 'placeholder_user_id',
    role: 'CUSTOMER'
  };

  return next();
};

export const authorize = (...allowedRoles) => {
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

export default {
  authenticate,
  authorize
};
