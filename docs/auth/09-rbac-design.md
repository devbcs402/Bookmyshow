# 09. Role-Based Access Control (RBAC) Design

## 1. Executive Summary

The platform uses fine-grained **Role-Based Access Control (RBAC)** to govern permissions across its three core applications: Customer Web/Mobile, Theatre Partner Management Portal, and Super Admin Governance Console.

Role assignments are strictly determined server-side during registration or Super Admin provisioning. Client request payloads attempting to modify roles, permissions, or tenant associations are filtered out and rejected.

---

## 2. Platform Roles Hierarchy

```
                                  +-----------------------+
                                  |      SUPER_ADMIN      |
                                  | Global Platform Scope |
                                  +-----------------------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
        +-------------------------+                       +-------------------------+
        |      THEATRE_OWNER      |                       |        CUSTOMER         |
        | Partner Tenant Scope    |                       | Self / Retail Scope     |
        +-------------------------+                       +-------------------------+
                     |
                     v
        +-------------------------+
        |     THEATRE_MANAGER     |
        | Operational Show Scope  |
        +-------------------------+
                     |
                     v
        +-------------------------+
        |      THEATRE_STAFF      |
        | Box Office / Scanner    |
        +-------------------------+
```

---

## 3. Role Definitions & Responsibilities

### 1. `CUSTOMER`
- **Scope**: Personal customer profile and retail bookings.
- **Capabilities**: Browse movies, cities, theatres, showtimes; lock seats; initiate payments; view booking history; cancel eligible reservations; post ratings and reviews.
- **Restrictions**: Strictly prohibited from accessing partner consoles or administrative routes.

### 2. `THEATRE_STAFF`
- **Scope**: On-ground box office and entry turnstiles at designated theatres.
- **Capabilities**: View show schedules, look up bookings by reference code, scan and validate QR-code digital tickets, issue box office seat holds.
- **Restrictions**: Cannot configure shows, alter pricing, or view financial balance sheets.

### 3. `THEATRE_MANAGER`
- **Scope**: Operational cinema management for assigned theatre locations.
- **Capabilities**: Manage screen seating layouts, schedule movie showtimes, adjust ticket tier pricing, oversee theatre staff accounts, view operational attendance reports.
- **Restrictions**: Cannot modify organization KYC or delete theatre partner entities.

### 4. `THEATRE_OWNER`
- **Scope**: Full tenant administrative scope over all cinema branches, screens, shows, and staff under their partner business ID.
- **Capabilities**: Add cinema branches, configure screen auditoriums, assign managers/staff, manage shows, view aggregated revenue and settlement statements.
- **Restrictions**: Strictly isolated to their own `partnerId`. Zero visibility into competing partner chains.

### 5. `SUPER_ADMIN`
- **Scope**: Global, multi-tenant platform scope.
- **Capabilities**: Review and approve/reject theatre partner onboarding applications, manage user accounts, suspend abusive actors, configure platform commission percentages, curate global movie metadata catalog.

---

## 4. Enforcement Middleware

### `authorizeRoles(...allowedRoles)`
Enforces coarse-grained role containment at route boundaries:

```javascript
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
```

