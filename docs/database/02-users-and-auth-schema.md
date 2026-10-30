# 02. Users, Authentication & Access Control Schema Specification

## 1. Overview & Security Architecture

The Authentication and User Identity subsystem governs security, authentication state, credential verification, and multi-tenant authorization. In accordance with zero-trust security standards:
- **Zero Plain-Text Credentials**: Passwords are saved strictly as salted, memory-hard **Argon2id** hashes.
- **Zero Plain-Text Verification Tokens / OTPs**: 6-digit phone/email OTPs and refresh token secrets are hashed with **SHA-256** prior to persistence.
- **Stateless Tokens with Stateful Revocation**: Short-lived JWTs (15 min) are signed statelessly; stateful revocation and token rotation family reuse detection are governed by `refresh_tokens`.

---

## 2. Collection Schemas

### 2.1 Collection: `users`

#### A. Purpose
Stores global identity profiles for all platform personas (retail customers, cinema partner owners, operational cinema managers, gate staff, and platform super admins).

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `name` | `String` | Yes | - | Trim, min: 2, max: 100 | Full legal or display name |
| `email` | `String` | Yes | - | Lowercase, valid email regex | Unique account identifier |
| `phone` | `String` | No | - | E.164 standard regex | Mobile number for SMS OTP & ticket delivery |
| `passwordHash` | `String` | Yes | - | Argon2id formatted string | Salted password hash |
| `roleId` | `ObjectId` | Yes | - | Ref: `roles` | Assigned RBAC role |
| `roleCode` | `String` | Yes | `CUSTOMER` | Enum: `CUSTOMER`, `THEATRE_OWNER`, `THEATRE_MANAGER`, `THEATRE_STAFF`, `SUPER_ADMIN` | Denormalized for fast zero-join auth checks |
| `partnerId` | `ObjectId` | No | `null` | Ref: `theatre_partners` | Mandatory if role is partner owner, manager, or staff |
| `assignedTheatres`| `[ObjectId]` | No | `[]` | Refs: `theatres` | List of cinema properties this user has operational authority over |
| `cityId` | `ObjectId` | No | `null` | Ref: `cities` | Customer's preferred active city |
| `isEmailVerified`| `Boolean` | Yes | `false` | Boolean | True once email confirmation OTP is validated |
| `isPhoneVerified`| `Boolean` | Yes | `false` | Boolean | True once SMS OTP is validated |
| `isActive` | `Boolean` | Yes | `true` | Boolean | Account active status (toggled on suspension) |
| `lastLoginAt` | `Date` | No | `null` | ISO Date | Timestamp of most recent successful login |
| `deletedAt` | `Date` | No | `null` | ISO Date | Null if active; timestamp indicates soft delete |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Audit timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Audit timestamp |

#### C. Unique Constraints & Indexes
- **Unique**: `{ email: 1 }` (Enforces unique email across all users).
- **Sparse Unique**: `{ phone: 1 }` (Enforces unique phone number when provided).
- **Compound Tenant Index**: `{ partnerId: 1, roleCode: 1, isActive: 1 }` (Fast partner staff queries).
- **Filter Index**: `{ isActive: 1, deletedAt: 1 }`.

#### D. Relationships & Ownership
- References: `roles._id`, `theatre_partners._id`, `theatres._id`, `cities._id`.
- Tenant Ownership: `CUSTOMER` and `SUPER_ADMIN` have `partnerId = null`. Partners and staff belong strictly to their parent `theatre_partners` tenant.

#### E. Example JSON Document
```json
{
  "_id": { "$oid": "67220b3f81e7d23a104f9810" },
  "name": "Rajesh Sharma",
  "email": "rajesh.sharma@example.com",
  "phone": "+919876543210",
  "passwordHash": "$argon2id$v=19$m=65536,t=3,p=4$2j0G...$w8Jq...",
  "roleId": { "$oid": "67220b3f81e7d23a104f9801" },
  "roleCode": "THEATRE_OWNER",
  "partnerId": { "$oid": "67220b3f81e7d23a104f9901" },
  "assignedTheatres": [
    { "$oid": "67220b3f81e7d23a104f9911" },
    { "$oid": "67220b3f81e7d23a104f9912" }
  ],
  "cityId": { "$oid": "67220b3f81e7d23a104f9701" },
  "isEmailVerified": true,
  "isPhoneVerified": true,
  "isActive": true,
  "lastLoginAt": { "$date": "2026-10-30T10:15:00.000Z" },
  "deletedAt": null,
  "createdAt": { "$date": "2026-08-15T09:30:00.000Z" },
  "updatedAt": { "$date": "2026-10-30T10:15:00.000Z" }
}
```

---

### 2.2 Collection: `roles`

#### A. Purpose
Maintains system authorization roles for RBAC.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `code` | `String` | Yes | - | UpperCase, Unique | `CUSTOMER`, `THEATRE_OWNER`, `THEATRE_MANAGER`, `THEATRE_STAFF`, `SUPER_ADMIN` |
| `name` | `String` | Yes | - | Trim, max: 100 | Human-readable role title |
| `description` | `String` | No | `""` | Max: 250 chars | Purpose and scope of role |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Indexes & Constraints
- **Unique**: `{ code: 1 }`.
- Soft Delete: No (System core definitions).

---

### 2.3 Collection: `permissions`

#### A. Purpose
Atomic functional capability tags verified during route authorization.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `action` | `String` | Yes | - | Format: `resource:action`, Unique | E.g., `theatres:create`, `shows:publish` |
| `module` | `String` | Yes | - | Enum: `AUTH`, `CATALOG`, `THEATRE`, `SHOW`, `BOOKING`, `PAYMENT`, `SYSTEM` | Grouping tag |
| `description` | `String` | No | `""` | Max: 250 chars | Explanation of permission |

#### C. Indexes & Constraints
- **Unique**: `{ action: 1 }`.

---

### 2.4 Collection: `role_permissions`

#### A. Purpose
Normalized junction collection mapping permissions to roles.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `_id` | `ObjectId` | Yes | Auto | Primary Key |
| `roleId` | `ObjectId` | Yes | - | Ref: `roles` |
| `permissionId` | `ObjectId` | Yes | - | Ref: `permissions` |
| `createdAt` | `Date` | Yes | Auto | Timestamp |

#### C. Unique Constraints & Indexes
- **Compound Unique**: `{ roleId: 1, permissionId: 1 }`.

---

### 2.5 Collection: `refresh_tokens`

#### A. Purpose
Enforces secure JWT token rotation and immediate session termination. Tracks token families; if an invalidated token is reused, all tokens in the family are revoked to combat token hijacking.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `userId` | `ObjectId` | Yes | - | Ref: `users` | Owner of the session |
| `tokenHash` | `String` | Yes | - | SHA-256 hash (64 hex chars) | Secure hash of opaque refresh token |
| `familyId` | `String` | Yes | - | UUID v4 | Token generation lineage identifier |
| `userAgent` | `String` | No | `""` | Max: 255 | Client browser/device string |
| `ipAddress` | `String` | No | `""` | IPv4/IPv6 string | Client IP on issuance |
| `isRevoked` | `Boolean` | Yes | `false` | Boolean | True if explicitly invalidated or replaced |
| `expiresAt` | `Date` | Yes | - | ISO Date | Hard expiry (7 days from issue) |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Indexes & Constraints
- **Unique**: `{ tokenHash: 1 }`.
- **TTL Index**: `{ expiresAt: 1 }` (Expire after 0 seconds when `expiresAt` is reached; automatically deleted by MongoDB WiredTiger background thread).
- **Lookup Index**: `{ userId: 1, familyId: 1, isRevoked: 1 }`.

---

### 2.6 Collection: `otp_verifications`

#### A. Purpose
Manages short-lived phone and email verification codes with automated expiration and brute-force rate-limiting counters.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `target` | `String` | Yes | - | Lowercase email or E.164 phone | Destination identifier |
| `targetType` | `String` | Yes | - | Enum: `EMAIL`, `PHONE` | Channel type |
| `purpose` | `String` | Yes | - | Enum: `REGISTRATION`, `LOGIN`, `PASSWORD_RESET` | Use-case intent |
| `otpHash` | `String` | Yes | - | SHA-256 hash of 6-digit PIN | Cryptographic hash of OTP |
| `attempts` | `Number` | Yes | `0` | Max: 5 attempts before lockout | Failed verification attempts |
| `isVerified` | `Boolean` | Yes | `false` | Boolean | Marked true once matched |
| `expiresAt` | `Date` | Yes | - | Current Time + 10 Mins | Strict TTL expiry |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Indexes & Constraints
- **TTL Index**: `{ expiresAt: 1 }` (Auto-purges expired OTP records).
- **Compound Index**: `{ target: 1, purpose: 1, isVerified: 1 }`.

