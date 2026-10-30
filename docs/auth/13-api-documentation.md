# 13. API Documentation: Authentication & User Management

## 1. Overview & Base URL

All endpoints conform to standard JSON REST conventions and return structured responses via `ApiResponse`.

- **Base URL**: `/api/v1`
- **Rate Limit Headers**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
- **Correlation Header**: `x-request-id` returned on every response

---

## 2. Authentication Endpoints (`/api/v1/auth`)

### 1. `POST /auth/register`
Register a new retail customer account.
- **Rate Limit**: 15 req / 15m
- **Request Body**:
```json
{
  "name": "Aarav Patel",
  "email": "aarav.patel@example.com",
  "mobile": "+919876543210",
  "password": "SecurePassword@2026",
  "confirmPassword": "SecurePassword@2026",
  "acceptedTerms": true
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Account registered successfully. A verification code has been dispatched.",
  "data": {
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Aarav Patel",
    "email": "aarav.patel@example.com",
    "phone": "+919876543210",
    "role": "CUSTOMER",
    "isEmailVerified": false
  }
}
```

---

### 2. `POST /auth/theatre-owner/register`
Onboard a new cinema partner organization.
- **Rate Limit**: 15 req / 15m
- **Request Body**:
```json
{
  "ownerName": "Sunil Shetty",
  "businessEmail": "sunil@shettycinemas.com",
  "mobile": "+919876543211",
  "businessName": "Shetty Cinema Chain",
  "businessAddress": "MG Road, Bengaluru, KA",
  "gstin": "29AAAAA0000A1Z5",
  "pan": "AAAAA0000A",
  "password": "PartnerSecurePassword@123",
  "confirmPassword": "PartnerSecurePassword@123",
  "acceptedTerms": true
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Theatre partner onboarding submitted successfully. Awaiting Super Admin approval.",
  "data": {
    "userId": "65f1a2b3c4d5e6f7a8b9c0d2",
    "ownerName": "Sunil Shetty",
    "businessEmail": "sunil@shettycinemas.com",
    "businessName": "Shetty Cinema Chain",
    "partnerId": "65f1a2b3c4d5e6f7a8b9c0d3",
    "role": "THEATRE_OWNER",
    "approvalStatus": "PENDING_APPROVAL"
  }
}
```

---

### 3. `POST /auth/login`
Authenticate using email or Indian mobile number + password.
- **Rate Limit**: 15 req / 15m
- **Request Body**:
```json
{
  "identifier": "aarav.patel@example.com",
  "password": "SecurePassword@2026"
}
```
- **Response (200 OK)**:
- **Set-Cookie**: `refreshToken=<jwt>; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=604800`
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Aarav Patel",
      "email": "aarav.patel@example.com",
      "phone": "+919876543210",
      "role": "CUSTOMER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 4. `POST /auth/refresh`
Rotate refresh token and issue a fresh access token.
- **Request**: Cookie `refreshToken=<token>` or Body `{"refreshToken": "<token>"}`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 5. `POST /auth/logout`
Revoke the current active session.
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 6. `POST /auth/logout-all`
Revoke all active sessions across all devices for the authenticated user.
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "All active sessions have been revoked successfully"
}
```

---

### 7. `POST /auth/otp/send`
Dispatch a 6-digit verification code via email or SMS.
- **Request Body**:
```json
{
  "target": "+919876543210",
  "targetType": "PHONE",
  "purpose": "PHONE_VERIFICATION"
}
```

---

### 8. `POST /auth/otp/verify`
Verify submitted code.
- **Request Body**:
```json
{
  "target": "+919876543210",
  "purpose": "PHONE_VERIFICATION",
  "otp": "489201"
}
```

---

### 9. `POST /auth/password/forgot`
Request password reset link. Returns generic response protecting against enumeration.
- **Request Body**:
```json
{
  "identifier": "aarav.patel@example.com"
}
```

---

### 10. `POST /auth/password/reset`
Submit reset token and new password.
- **Request Body**:
```json
{
  "token": "4a7b9c...",
  "newPassword": "NewStrongPassword@2026",
  "confirmPassword": "NewStrongPassword@2026"
}
```

---

### 11. `POST /auth/password/change`
Authenticated password change. Revokes all other active sessions.
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "currentPassword": "OldPassword@2026",
  "newPassword": "NewStrongPassword@2026",
  "confirmPassword": "NewStrongPassword@2026"
}
```

---

## 3. User Management Endpoints (`/api/v1/users`)

All endpoints require `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users/me` | Fetch authenticated user profile. |
| `PATCH` | `/users/me` | Update whitelisted profile fields (`name`, `cityId`). |
| `GET` | `/users/me/status` | View verification and account active status. |
| `DELETE` | `/users/me` | Soft-deactivate account and invalidate all active sessions. |
| `GET` | `/users/me/sessions` | Enumerate active device sessions, identifying current device. |
| `DELETE` | `/users/me/sessions/:sessionId` | Invalidate a specific active device session. |
| `DELETE` | `/users/me/sessions` | Invalidate all sessions except the currently active device. |

