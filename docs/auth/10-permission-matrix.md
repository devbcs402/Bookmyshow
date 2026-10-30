# 10. Role-Permission Matrix

## 1. Executive Summary

To avoid hardcoded role checks deep inside services and to enable future dynamic permission delegation, the system defines 23 discrete, fine-grained **Permissions** and maps them to the canonical roles via an immutable `RolePermissions` configuration matrix.

---

## 2. Granular Role-Permission Mapping Matrix

| Permission Identifier | Description | `CUSTOMER` | `THEATRE_STAFF` | `THEATRE_MANAGER` | `THEATRE_OWNER` | `SUPER_ADMIN` |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **USER_READ** | View user profile data | Yes | Yes | Yes | Yes | Yes |
| **USER_UPDATE** | Modify own user profile | Yes | - | - | Yes | Yes |
| **USER_DELETE** | Deactivate / delete account | - | - | - | - | Yes |
| **USER_MANAGE** | Suspend, ban, or unlock users | - | - | - | - | Yes |
| **MOVIE_READ** | Browse movie catalog, cast, media | Yes | Yes | Yes | Yes | Yes |
| **MOVIE_CREATE** | Add new title to movie catalog | - | - | - | - | Yes |
| **MOVIE_UPDATE** | Edit movie synopsis, trailer links | - | - | - | - | Yes |
| **MOVIE_DELETE** | Remove title from active catalog | - | - | - | - | Yes |
| **THEATRE_READ** | View cinema details & screen layouts | Yes | Yes | Yes | Yes | Yes |
| **THEATRE_CREATE** | Onboard new cinema / branch | - | - | - | Yes | Yes |
| **THEATRE_UPDATE** | Update cinema amenities, address | - | - | Yes | Yes | Yes |
| **THEATRE_DELETE** | Decommission cinema location | - | - | - | Yes | Yes |
| **SCREEN_MANAGE** | Configure seating layouts & tiers | - | - | Yes | Yes | Yes |
| **SHOW_READ** | Query scheduled show timings | Yes | Yes | Yes | Yes | Yes |
| **SHOW_CREATE** | Schedule movie screening slot | - | - | Yes | Yes | Yes |
| **SHOW_UPDATE** | Modify showtime / screen assignment | - | - | Yes | Yes | Yes |
| **SHOW_DELETE** | Cancel scheduled show | - | - | Yes | Yes | Yes |
| **BOOKING_READ** | Query ticket bookings & status | Yes (Self) | Yes (Cinema) | Yes (Cinema) | Yes (Chain) | Yes (All) |
| **BOOKING_MANAGE** | Scan tickets, resolve dispute | - | Yes | Yes | Yes | Yes |
| **BOOKING_CANCEL** | Cancel eligible booking / request refund | Yes (Self) | - | - | - | Yes |
| **PAYMENT_READ** | Inspect payment transactions | - | - | - | Yes | Yes |
| **REFUND_MANAGE** | Authorize manual refund processing | - | - | - | - | Yes |
| **REPORT_READ** | View revenue, attendance analytics | - | - | Yes | Yes | Yes |
| **STAFF_MANAGE** | Create / manage cinema managers & staff | - | - | Yes | Yes | Yes |
| **ROLE_MANAGE** | Configure custom staff roles | - | - | - | - | Yes |
| **PERMISSION_MANAGE**| Modify permission bindings | - | - | - | - | Yes |
| **PARTNER_APPROVE** | Review & approve partner KYC | - | - | - | - | Yes |

---

## 3. Middleware Implementation

```javascript
export const authorizePermission = permission => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('User is not authenticated', ErrorCodes.UNAUTHORIZED));
    }

    // Super Admin has implicit global permissions
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
```

