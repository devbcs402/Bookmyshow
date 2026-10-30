# 04. JWT Token Strategy

## 1. Executive Summary

The platform uses a decoupled dual-token architecture that balances security, performance, and user convenience. Short-lived Access Tokens minimize the blast radius of token interception, while rotating Refresh Tokens protected by browser security primitives (`HttpOnly`, `SameSite=Strict`, `Secure`) enable seamless continuous sessions.

---

## 2. Token Definitions & Payload Schemas

### A. Access Token (`ACCESS_TOKEN`)
- **Purpose**: Authorize stateless API operations against protected endpoints without hitting the database on every micro-call.
- **Lifetime**: 15 minutes (`JWT_ACCESS_EXPIRES_IN=15m`).
- **Storage**: Client runtime memory (React Redux/Context state or mobile memory space). Never persisted to `localStorage` or `sessionStorage` (preventing Cross-Site Scripting [XSS] token extraction).
- **Signing Algorithm**: HMAC SHA-256 (`HS256`) using high-entropy secret `JWT_ACCESS_SECRET`.

```json
{
  "sub": "65f1a2b3c4d5e6f7a8b9c0d1",
  "sid": "65f1a2b3c4d5e6f7a8b9c0d2",
  "role": "THEATRE_OWNER",
  "partnerId": "65f1a2b3c4d5e6f7a8b9c0d3",
  "type": "ACCESS_TOKEN",
  "iss": "bookmyshow-auth-service",
  "aud": "bookmyshow-client-apps",
  "iat": 1772345600,
  "exp": 1772346500
}
```

### B. Refresh Token (`REFRESH_TOKEN`)
- **Purpose**: Rotate and issue fresh Access Tokens via `POST /api/v1/auth/refresh`.
- **Lifetime**: 7 days (`JWT_REFRESH_EXPIRES_IN=7d`).
- **Storage**: 
  - **Web Browsers**: Delivered in an `HttpOnly`, `SameSite=Strict`, `Secure` cookie, scoped strictly to the `/api/v1/auth` path.
  - **Native Mobile Apps**: Response body field, stored in hardware-backed keystores (iOS Keychain / Android Keystore).
- **Signing Algorithm**: HMAC SHA-256 (`HS256`) using high-entropy secret `JWT_REFRESH_SECRET`.

```json
{
  "sub": "65f1a2b3c4d5e6f7a8b9c0d1",
  "sid": "65f1a2b3c4d5e6f7a8b9c0d2",
  "fid": "65f1a2b3c4d5e6f7a8b9c0d4",
  "jti": "a8f3b2c1d4e5f6a7b8c9d0e1f2a3b4c5",
  "type": "REFRESH_TOKEN",
  "iss": "bookmyshow-auth-service",
  "aud": "bookmyshow-client-apps",
  "iat": 1772345600,
  "exp": 1772950400
}
```

---

## 3. Cryptographic Storage & Verification Matrix

```mermaid
graph TD
    Client[Client App] -->|1. Present Access Token in Header| API[Express API Gateway]
    API -->|2. Verify Signature, iss, aud, exp| TokenVerify[verifyAccessToken()]
    TokenVerify -->|3. Type Assertion| CheckType{type === 'ACCESS_TOKEN'}
    CheckType -- No --> Reject401[401 Unauthorized: Invalid Token Type]
    CheckType -- Yes --> CheckSession{DB Session isRevoked === false}
    CheckSession -- No --> RejectRevoked[401 Unauthorized: Session Expired / Revoked]
    CheckSession -- Yes --> Hydrate[Hydrate req.user Context & Next]
```

### Cookie Hardening Configuration

```javascript
export const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,                                       // Blocks access from JavaScript (document.cookie)
  secure: process.env.NODE_ENV === 'production',        // Enforces HTTPS transport
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Mitigates CSRF
  path: '/api/v1/auth',                                 // Restricts cookie transmission to auth endpoints
  maxAge: 7 * 24 * 60 * 60 * 1000                       // 7 days in milliseconds
});
```

