# Part 9 — Lock Ownership & Security (BOLA / IDOR Protection)

## 1. Threat Modeling: Broken Object Level Authorization (BOLA)

In public booking platforms, malicious actors often attempt to exploit insecure direct object references (IDOR / BOLA) to disrupt ticketing operations. Common attack vectors include:

1. **Malicious Release Attacks**:
   - Attacker Bob observes that Alice locked front-row seats `A1` and `A2`.
   - Bob sends `DELETE /api/v1/shows/:showId/seat-locks` supplying Alice's seat IDs in an attempt to prematurely release Alice's hold and steal her seats.
2. **Expired-Lock Deletion Race Condition**:
   - Alice locks seat `A1`. Alice's network lags and her lock expires at $t = 300\text{s}$.
   - Bob locks seat `A1` at $t = 301\text{s}$.
   - Alice's browser finally wakes up and issues an automatic cleanup `DELETE` call for `A1`.
   - If the deletion was unconditional (e.g., `redis.del(key)`), Alice's request would inadvertently delete Bob's legitimate, brand-new hold!
3. **Privilege Escalation on Renewal**:
   - Attacker attempts to hijack another patron's lock by calling renewal with their own JWT token.

---

## 2. Multi-Tier Security Defenses

### 2.1 Cryptographic `lockId` + Authenticated `userId` Pairing
Every lock key contains a JSON document with two immutable security attributes:
```json
{
  "lockId": "c6a32d1f-8e4b-4a5c-9c71-2b0f4a8d9e23",
  "userId": "65f1a2b3c4d5e6f7a8b9c0u1"
}
```
- `lockId`: A cryptographically random UUIDv4 generated on the server and returned only to the lock creator.
- `userId`: The authenticated user's ID extracted directly from the verified cryptographic JWT access token (`req.user.id`).

Client requests to `DELETE` or `PATCH` must provide both the matching `lockId` in the JSON body AND the bearer token of the user who originally acquired the lock.

---

## 3. Atomic Safe Release: `RELEASE_MULTI_SEAT_LOCKS_LUA`

The safe release Lua script enforces compare-and-delete semantics:

```lua
-- KEYS: Array of seat lock keys
-- ARGV[1]: expectedLockId
-- ARGV[2]: expectedUserId

local expectedLockId = ARGV[1]
local expectedUserId = ARGV[2]

for i, key in ipairs(KEYS) do
  local val = redis.call('get', key)
  if val then
    local data = cjson.decode(val)
    -- STRICT VERIFICATION: Both lockId and userId must match
    if data.lockId == expectedLockId and data.userId == expectedUserId then
      redis.call('del', key)
    end
  end
end

return { 1, 'OK' }
```

### Security Proof:
- If Attacker Bob sends a DELETE request for Alice's seats, `data.userId ~= expectedUserId` causes the script to ignore the key and leave Alice's hold untouched.
- If Alice's lock expired and Bob took over the seat with a new `lockId`, Alice's delayed release script sees `data.lockId ~= expectedLockId`, ensuring Bob's lock is **never deleted**.

---

## 4. Privacy & Zero PII Leakage

1. **Anonymized Real-time WebSocket Broadcasts**:
   - Socket.IO broadcasts emit only `{ showId, seatIds: ['...'] }`.
   - No user identity, customer email, telephone number, or `lockId` is ever sent to the public WebSocket room.
2. **Context-Aware API Layout**:
   - `GET /shows/:showId/seats` supports `optionalAuthenticate`.
   - If the request has a valid Bearer token for User A:
     - User A's locked seats are rendered as `LOCKED_BY_ME` with accurate countdown timers.
     - All other patrons' locked seats are rendered as `LOCKED_BY_OTHER` with no identifying details.
   - If unauthenticated, all locked seats are rendered as `LOCKED_BY_OTHER`.

