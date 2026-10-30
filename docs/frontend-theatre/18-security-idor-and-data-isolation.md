# 18 – Security, IDOR Defense, and Data Isolation

## 1. Security Architecture
The Theatre Partner Dashboard handles sensitive financial, customer, and operational data.
The security posture includes:

### 1.1 Insecure Direct Object Reference (IDOR) Defense
- No backend route relies solely on resource ID parameters (e.g., `theatreId`, `screenId`, `showId`, `bookingId`).
- Every query automatically joins against the authenticated user's `partnerId`.
- If an attacker manipulates the URL to reference another partner's show or screen, the backend query returns `404 Not Found` rather than leaking existence or details.

### 1.2 Cross-Site Scripting (XSS) Prevention
- All user inputs (theatre names, addresses, facilities) are sanitized and validated with Zod schemas.
- React automatically escapes rendered strings in JSX.

### 1.3 CSRF Protection & Token Security
- JWT Access tokens are stored in memory or secured storage, while refresh tokens reside in `HttpOnly`, `SameSite=Strict` secure cookies.
- Logout revokes active tokens on the server and invalidates client credentials.

