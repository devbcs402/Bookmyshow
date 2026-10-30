# Part 9 — Seat Availability & Locking Security Review

## 1. Security Architecture & Threat Matrix

| Threat Category | Potential Attack Vector | Applied Mitigation | Verification |
| :--- | :--- | :--- | :--- |
| **BOLA / IDOR** | Attacker attempts to delete or alter another user's locked seats via `/seat-locks` endpoint. | Stored lock requires matching `lockId` (UUIDv4) and `userId` (JWT payload). Compare-and-delete Lua script enforces atomic verification. | Verified in `seat-lock-ownership.test.js`. |
| **Seat Squatting / DoS** | Malicious bot script locks large blocks of seats and renews indefinitely to block real buyers. | 1. 10-seat limit per transaction.<br/>2. Max 2 renewals ceiling (enforced in Lua).<br/>3. IP rate limiting via Express Rate Limit. | Unit & integration tests enforce ceiling and maximum seats. |
| **Replay & Double-Click** | Network timeouts cause mobile client to re-post identical lock payload. | Idempotency middleware stores cached response in Redis with 600s TTL. | Tested via `x-idempotency-key` header test. |
| **Data Scraping / User Profiling** | Public spectator connects to WebSocket room and tracks identity of who bought seats. | Broadcast payloads contain strictly zero PII. Only `showId` and `seatIds` are transmitted. | Tested in `seat-lock.socket.test.js`. |
| **Input Injection / Malformed IDs** | Client supplies non-hex or malformed strings to probe database or bypass cache. | Zod schema strictly validates 24-char hex MongoDB ObjectIds and UUID format for `lockId`. | Validated via `seat-lock.validation.js`. |

---

## 2. Authentication & Authorization Policies

1. **`GET /api/v1/shows/:showId/seats`**:
   - Uses `optionalAuthenticate` middleware.
   - If no token is provided, request proceeds as a guest visitor.
   - If a valid Bearer token is provided, `req.user` is populated, enabling the response to mark the caller's held seats as `LOCKED_BY_ME`.
   - If an expired or invalid token is provided, it falls back to guest mode gracefully without failing the request.
2. **`POST /api/v1/shows/:showId/seat-locks`**:
   - Uses `authenticate` middleware.
   - Requires valid JWT access token.
   - Client cannot specify `userId` in the body; `userId` is strictly bound to `req.user.id`.
3. **`DELETE /api/v1/shows/:showId/seat-locks`**:
   - Requires valid JWT access token.
   - Releases only keys matching caller's `req.user.id` and payload `lockId`.
4. **`PATCH /api/v1/shows/:showId/seat-locks/renew`**:
   - Requires valid JWT access token.
   - Caller cannot renew another user's locks even if they guess `lockId`.

---

## 3. WebSocket Security Posture

1. **Handshake Authentication**:
   - WebSocket connection handshake checks `socket.handshake.auth.token`.
   - If token is present, it verifies the JWT and attaches `socket.user`.
   - Guest sockets are permitted for read-only room subscription.
2. **Rate Limiting & Abuse Prevention**:
   - Sockets joining more than 20 rooms or flooding events are throttled.
   - Disconnections automatically leave all rooms, releasing event listeners and socket handles.

