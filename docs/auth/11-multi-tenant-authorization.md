# 11. Multi-Tenant Authorization & Boundary Isolation

## 1. Executive Summary

The platform hosts multiple distinct cinema chain operators (e.g., PVR INOX, Cinepolis, MovieMax, local independents) within a single shared database cluster. 

To prevent data leakage, unauthorized inspection, or tampering across tenant boundaries (**Broken Object Level Authorization [BOLA] / Insecure Direct Object References [IDOR]**), the system enforces strict tenant context verification in middleware and repository query layers.

---

## 2. Multi-Tenancy Architecture

```
                                  +-------------------------------------------------------------+
                                  |                     SUPER_ADMIN                             |
                                  |  Has global visibility across all partner organizations    |
                                  +-------------------------------------------------------------+
                                                                 |
                                +--------------------------------+--------------------------------+
                                |                                                                 |
                                v                                                                 v
+---------------------------------------------------------------+ +---------------------------------------------------------------+
|                      TENANT ORGANIZATION A                    | |                      TENANT ORGANIZATION B                    |
|                Partner ID: 65f1a2b3c4d5e6f7a8b9c0aa           | |                Partner ID: 65f1a2b3c4d5e6f7a8b9c0bb           |
+---------------------------------------------------------------+ +---------------------------------------------------------------+
| - Partner Staff (Owner, Managers, Ushers)                     | | - Partner Staff (Owner, Managers, Ushers)                     |
| - Cinemas (Mumbai Bandra, Bengaluru Whitefield)               | | - Cinemas (Delhi Connaught, Hyderabad Hitec)                  |
| - Screens & Seating Layouts                                   | | - Screens & Seating Layouts                                   |
| - Shows & Ticket Pricing                                      | | - Shows & Ticket Pricing                                      |
| - Bookings & Revenue Reports                                  | | - Bookings & Revenue Reports                                  |
+---------------------------------------------------------------+ +---------------------------------------------------------------+
                                |                                                                 |
                                +----------------------- STRICT ISOLATION ------------------------+
                                                 (Cross-Tenant Access Prohibited)
```

---

## 3. Threat Model: BOLA / IDOR Attacks

In a naive API design, an authenticated Theatre Owner A might invoke an endpoint such as:
`GET /api/v1/theatres/partner_b_id/revenue-report` or `DELETE /api/v1/shows/show_from_partner_b`

Without tenant isolation, the system checks only whether the user is logged in as `THEATRE_OWNER`, inadvertently granting access to competitor data.

### Platform Defense
The `requireTenantScope` middleware prevents this vulnerability by comparing the authenticated token's immutable `partnerId` with the targeted resource's tenant ownership.

---

## 4. Middleware Implementation: `requireTenantScope`

```javascript
export const requireTenantScope = (partnerIdExtractor = 'params.partnerId') => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('User is not authenticated', ErrorCodes.UNAUTHORIZED));
    }

    // 1. Super Admin has global platform-wide clearance
    if (req.user.role === Roles.SUPER_ADMIN) {
      return next();
    }

    // 2. Tenant users must possess an approved partnerId
    if (!req.user.partnerId) {
      return next(
        new AuthorizationError(
          'Access forbidden: User is not associated with an approved theatre partner organization',
          ErrorCodes.TENANT_ACCESS_DENIED
        )
      );
    }

    // 3. Extract target partnerId from request params/body/query
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

    // 4. Assert boundary match
    if (targetPartnerId && String(targetPartnerId) !== String(req.user.partnerId)) {
      return next(
        new AuthorizationError(
          'Access denied: Cross-tenant resource access is strictly prohibited',
          ErrorCodes.TENANT_ACCESS_DENIED
        )
      );
    }

    // 5. Inject verified partnerId for query filtering
    req.tenantPartnerId = req.user.partnerId;

    return next();
  };
};
```

---

## 5. Defense-in-Depth in Query Execution

Even if an endpoint omits `requireTenantScope`, repositories enforce tenant isolation by appending the tenant filter:
```javascript
// Downstream Show Repository Pattern
const shows = await Show.find({
  theatrePartnerId: req.tenantPartnerId,
  isDeleted: false
}).exec();
```
Client payloads can never override `req.tenantPartnerId`.

