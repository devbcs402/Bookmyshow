# 02. Registration Workflow

## 1. Overview

The platform supports two distinct onboarding tracks:
1. **Retail Customer Registration**: Instant self-service registration enabling movie discovery, seat reservation, and booking.
2. **Theatre Partner Onboarding**: Enterprise business registration with mandatory compliance verification and Super Admin KYC approval prior to operational activation.

---

## 2. Retail Customer Registration Workflow

### Step-by-Step Execution Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Retail Customer
    participant API as Express API (/auth/register)
    participant RateLimiter as Auth Rate Limiter
    participant Validator as Zod Schema Validator
    participant Service as AuthService
    participant Repo as AuthRepository
    participant DB as MongoDB (users)
    participant Notif as EmailNotificationProvider

    User->>API: POST /api/v1/auth/register (name, email, mobile, password, confirmPassword, acceptedTerms)
    API->>RateLimiter: Check IP burst limit (15 req / 15 min)
    RateLimiter-->>API: Allowed
    API->>Validator: Validate fields & password complexity
    Validator-->>API: Validated payload
    API->>Service: registerCustomer(payload)
    Service->>Repo: Check existing email or phone
    Repo->>DB: findUserByEmail & findUserByPhone
    DB-->>Repo: null (no conflict)
    Service->>Service: hashPassword(password) [bcrypt 12 rounds]
    Service->>Repo: createUser({ role: CUSTOMER, approvalStatus: APPROVED, isEmailVerified: false })
    Repo->>DB: insertOne(userDoc)
    DB-->>Repo: Saved user
    Service->>Service: generateNumericOtp() [6 digits]
    Service->>Repo: createOtp({ target: email, purpose: REGISTRATION, otpHash })
    Service->>Notif: sendOtpEmail(email, otp)
    Service->>Repo: createAuditLog('CUSTOMER_REGISTERED')
    Service-->>API: Return sanitized user + requiresVerification: true
    API-->>User: 201 Created (ApiResponse)
```

### Validation Rules
- **Name**: String, trimmed, 2-100 characters.
- **Email**: Normalized lower-case, valid RFC 5322 regex. Unique across database.
- **Mobile**: Normalized to standard Indian E.164 (`+91[6-9]\d{9}`). Unique across database.
- **Password**: 8-64 characters, requiring at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character (`[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]`).
- **Confirm Password**: Exact string match with password.
- **Terms & Conditions**: Explicit boolean `true`.

---

## 3. Theatre Partner Onboarding Workflow

### Step-by-Step Execution Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Theatre Business Owner
    participant API as Express API (/auth/theatre-owner/register)
    participant Service as AuthService
    participant Repo as AuthRepository
    participant DB as MongoDB
    participant AdminQueue as Platform Admin Queue

    Owner->>API: POST /api/v1/auth/theatre-owner/register (ownerName, businessEmail, mobile, businessName, businessAddress, gstin, pan, password)
    API->>Service: registerTheatreOwner(payload)
    Service->>Repo: Check existing email or phone
    Repo-->>Service: Unique verified
    Service->>Service: hashPassword(password)
    Service->>Repo: createUser({ role: THEATRE_OWNER, approvalStatus: PENDING_APPROVAL })
    Repo->>DB: insertOne(userDoc)
    Service->>Repo: createTheatrePartner({ ownerUserId, businessName, businessAddress, gstin, pan, kycStatus: PENDING })
    Repo->>DB: insertOne(theatrePartnerDoc)
    Service->>Repo: updateUser(userId, { partnerId })
    Service->>AdminQueue: Queue onboarding notification to Super Admin
    Service->>Repo: createAuditLog('THEATRE_OWNER_REGISTERED')
    Service-->>API: Return partner profile + approvalStatus: PENDING_APPROVAL
    API-->>Owner: 201 Created ("Application submitted, awaiting review")
```

### Security & Compliance Controls
1. **Approval Status Invariant**: Theatre partner accounts default to `approvalStatus: PENDING_APPROVAL`. Any login attempts while pending return `401 Unauthorized` with an explicit message indicating the application is under review.
2. **KYC Verification**: Business legal metadata (`gstin`, `pan`, business registration address) is recorded in the `theatre_partners` entity for offline or automated compliance verification.
3. **Admin Approval Gate**: Only a `SUPER_ADMIN` can transition the status to `APPROVED` or `REJECTED`.

