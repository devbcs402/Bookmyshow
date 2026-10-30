# Global Error Handling, Exception Sanitization & API Reliability
**Document Reference**: `docs/production/05-error-handling.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Senior Backend Architect, Security Engineer  
**Status**: APPROVED  

---

## 1. Overview & Resiliency Architecture

In high-concurrency e-commerce and ticketing platforms, unhandled exceptions and raw database errors present severe risks:
1. **Security Vulnerability**: Exposing stack traces, table names, or database hostnames enables attackers to map system vulnerabilities.
2. **Client Deserialization Failures**: Inconsistent error response formats break frontend error boundaries and mobile app clients.
3. **Debugging Friction**: Errors lacking unique request correlation identifiers cannot be traced across server logs.

The BookMyShow platform implements an immutable, centralized error-handling interceptor ([`apps/backend/src/middlewares/error.middleware.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/middlewares/error.middleware.js)) coupled with domain-specific error classes derived from [`AppError`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/common/errors/app.error.js).

---

## 2. Standardized Error Response Envelope

Every failed HTTP response across all public, partner, and administrative APIs emits a uniform JSON schema:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed for entity",
  "errorCode": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address format"
    }
  ],
  "requestId": "6f29ab0b-410a-42c8-89c0-67a6d96e0012",
  "timestamp": "2026-10-30T11:27:00.000Z"
}
```

### Response Fields Specification
- `success`: Always `false`.
- `statusCode`: HTTP status code matching the response (400, 401, 403, 404, 409, 422, 429, 500, 503).
- `message`: Human-readable summary suitable for user display or logging.
- `errorCode`: Machine-readable, uppercase enum string (e.g. `INVALID_CREDENTIALS`, `SEAT_ALREADY_LOCKED`).
- `details`: Contextual structured metadata (e.g., array of field-level validation errors, conflicting resource keys), or `null`.
- `requestId`: The correlation UUID assigned by `requestIdMiddleware`.
- `timestamp`: UTC ISO 8601 string.
- `stack`: **Never present in production**. Only included in `development` when debugging.

---

## 3. Error Classification & Hierarchy

```
                      +-------------------+
                      |      Error        |
                      +-------------------+
                                |
                      +-------------------+
                      |     AppError      | (Base Domain Exception)
                      +-------------------+
                                |
        +-----------+-----------+-----------+-----------+
        |           |           |           |           |
  ValidationError  AuthError  ForbiddenError NotFoundError ConflictError
     (400)        (401)       (403)        (404)       (409)
```

| Exception Class | Default Status | Common Use Cases |
| :--- | :--- | :--- |
| `ValidationError` | `400 Bad Request` | Zod schema failures, invalid query filters, layout validation errors |
| `AuthenticationError` | `401 Unauthorized` | Missing Bearer token, expired access token, invalid password |
| `AuthorizationError` | `403 Forbidden` | Role mismatch, cross-tenant theatre access attempt (BOLA defense) |
| `NotFoundError` | `404 Not Found` | Movie, show, booking, or screen ID does not exist |
| `ConflictError` | `409 Conflict` | Concurrently locked seats, booking state transition violations |
| `RateLimitError` | `429 Too Many Requests` | Rate limit threshold exceeded on auth/search/booking APIs |
| `DatabaseError` | `500 Internal Error` | MongoDB connection timeout, replica set election failure |

---

## 4. Automatic Database Exception Interception

The centralized error middleware automatically transforms internal Mongoose and MongoDB driver exceptions into safe HTTP responses:

### 4.1 SyntaxError (Malformed JSON)
- **HTTP Code**: `400 Bad Request`
- **Error Code**: `MALFORMED_JSON`
- **Message**: "Malformed JSON payload in request body"

### 4.2 Mongoose ValidationError
- **HTTP Code**: `400 Bad Request`
- **Error Code**: `VALIDATION_ERROR`
- **Sanitization**: Strips raw internal validator regexes and returns clean `{ field, message, kind }` objects.

### 4.3 Mongoose CastError (Invalid ObjectId)
- **HTTP Code**: `400 Bad Request`
- **Error Code**: `INVALID_OBJECT_ID`
- **Message**: "Invalid identifier format for field ':field'"

### 4.4 MongoDB Duplicate Key (E11000)
- **HTTP Code**: `409 Conflict`
- **Error Code**: `DUPLICATE_RESOURCE`
- **Sanitization**: Extracts the unique indexed key (e.g., `email`, `slug`) and masks internal index names.

### 4.5 CORS Policy Violation
- **HTTP Code**: `403 Forbidden`
- **Error Code**: `FORBIDDEN`
- **Message**: "CORS Error: Origin ':origin' is not permitted by policy"

### 4.6 Production Non-Operational Shield
When any unexpected library exception or unhandled Promise rejection occurs in production (`config.NODE_ENV === 'production'`), the error middleware replaces internal messages with:
> *"An unexpected error occurred. Please contact system support."*

The complete original stack trace and error payload are securely written to the server's private structured logs tagged with `req.id`.

