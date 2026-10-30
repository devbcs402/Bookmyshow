# 06. Session Management

## 1. Architectural Philosophy

While JWT access tokens are stateless for fast authorization, enterprise security demands **authoritative stateful session governance**. The session management subsystem allows users and security administrators to monitor, inspect, and revoke active device logins in real time.

---

## 2. Session Schema & Database Storage

Stored in the `user_sessions` collection in MongoDB:

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | Unique session identifier (`sessionId`), embedded in access and refresh JWTs (`sid`). |
| `userId` | `ObjectId` | Foreign reference to the owning user (`users._id`). |
| `familyId` | `String` | Unique UUID binding all rotated refresh tokens of this session together. |
| `refreshTokenHash` | `String` | SHA-256 hash of the currently active rotating refresh token. |
| `isRevoked` | `Boolean` | Flag indicating whether the session has been terminated. Defaults to `false`. |
| `revocationReason` | `String` | Audit categorization (`USER_LOGOUT`, `PASSWORD_RESET`, `TOKEN_REUSE_DETECTED`, `ADMIN_ACTION`). |
| `userAgent` | `String` | Client browser / device user agent string. |
| `ipAddress` | `String` | Client public IP address recorded at login/refresh. |
| `lastActivityAt` | `Date` | Timestamp updated asynchronously on each authenticated API call. |
| `expiresAt` | `Date` | Absolute expiration date (7 days from last refresh). |
| `createdAt` | `Date` | Original session creation timestamp. |

### Automated Database Cleanup (TTL Index)
A native MongoDB Time-To-Live (TTL) index ensures terminated and abandoned sessions are automatically purged from disk:
```javascript
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

## 3. Session Governance Operations

```
+----------------------------------------------------------------------------------------------------------+
| USER SESSION CONTROL PANEL                                                                               |
+----------------------------------------------------------------------------------------------------------+
| Device: Chrome 130 on Windows 10 | IP: 103.24.112.5 | Last Active: Just now (THIS DEVICE)   [Current]    |
| Device: Mobile App on iOS 18     | IP: 49.37.150.12 | Last Active: 2 hours ago              [Revoke]     |
| Device: Firefox on MacOS         | IP: 182.72.45.9  | Last Active: Yesterday                [Revoke]     |
+----------------------------------------------------------------------------------------------------------+
| [ Revoke All Other Devices ]                                                                             |
+----------------------------------------------------------------------------------------------------------+
```

### Supported Operations

| Operation | Endpoint | HTTP Method | Action Performed |
| :--- | :--- | :--- | :--- |
| **List Active Sessions** | `/api/v1/users/me/sessions` | `GET` | Returns all non-revoked sessions for current user, flagging `isCurrent: true` for the active token's `sessionId`. |
| **Revoke Specific Session** | `/api/v1/users/me/sessions/:sessionId` | `DELETE` | Marks specified session as `isRevoked: true`. Clears cookie if revoking self. |
| **Revoke All Other Sessions** | `/api/v1/users/me/sessions` | `DELETE` | Revokes all user sessions except the currently active `req.user.sessionId`. |
| **Current Device Logout** | `/api/v1/auth/logout` | `POST` | Revokes current session and clears `refreshToken` cookie. |
| **Full Global Logout** | `/api/v1/auth/logout-all` | `POST` | Revokes all sessions across all devices for the user and clears cookie. |

---

## 4. Middleware Session Verification

On every authenticated HTTP request, the `authenticate` middleware inspects the session status in the database:
1. Decodes `sid` claim from the Access Token.
2. Queries `user_sessions` for `_id: sid`.
3. Verifies `isRevoked === false` and `expiresAt > new Date()`.
4. Asynchronously updates `lastActivityAt` without blocking request latency:
   ```javascript
   AuthRepository.touchSession(session._id).catch(() => {});
   ```
5. If revoked or missing, execution halts immediately with `401 Unauthorized` (`TOKEN_REVOKED`).

