# 14. MongoDB Multi-Document ACID Transaction Strategy

## 1. When to Use (and When NOT to Use) Transactions

MongoDB 4.0+ provides multi-document ACID transactions across replica sets. However, transactions incur computational overhead (maintaining WiredTiger snapshot history, lock acquisition, and coordination latency). 

### Golden Rule of Transactions
> **ACID Transactions are strictly reserved for multi-collection financial and inventory state transitions where intermediate states must never be observable, and partial failure would violate business invariants.**
> Normal read operations, catalog browsing, user profile updates, and temporary Redis lock acquisitions must **never** run inside MongoDB transactions.

```mermaid
graph TD
    subgraph TransactionalOps ["Operations Requiring MongoDB ACID Transactions"]
        Tx1["1. Booking Confirmation & Payment Finalization<br/>(bookings + show_seats + payments + shows.availableSeats)"]
        Tx2["2. Booking Cancellation & Inventory Restitution<br/>(bookings + show_seats + refunds + shows.availableSeats)"]
        Tx3["3. Coupon Redemption Settlement<br/>(coupon_redemptions + coupons.currentUsageCount + bookings)"]
        Tx4["4. Show Creation & Seat Template Cloning<br/>(shows + show_seats bulk generation + screen schedule validation)"]
    end

    subgraph NonTransactionalOps ["Operations Prohibited from MongoDB Transactions"]
        NT1["Temporary Seat Locks (Handled purely in Redis)"]
        NT2["Customer Catalog Browsing & Movie Details Lookups"]
        NT3["User Profile Edits & Password Updates"]
        NT4["In-App Notifications & Audit Log Appends"]
    end
```

---

## 2. Deep Dive: The Critical Booking Confirmation Transaction

When a client payment is verified (or a webhook arrives), the platform executes a 4-step atomic transaction:

```mermaid
sequenceDiagram
    autonumber
    participant App as Backend Service
    participant Mongo as MongoDB Replica Set
    participant Redis as Redis Lock Engine

    App->>Mongo: session.startTransaction({ readConcern: "snapshot", writeConcern: "majority" })
    
    rect rgb(240, 248, 255)
        Note over App,Mongo: 1. Verify & Commit Booking Record
        App->>Mongo: updateOne(bookings, { _id: bookingId, status: "PENDING_PAYMENT" }, { status: "CONFIRMED" })
        
        Note over App,Mongo: 2. Record Financial Ledger Capture
        App->>Mongo: updateOne(payments, { razorpayOrderId }, { status: "CAPTURED", razorpayPaymentId })
        
        Note over App,Mongo: 3. Permanently Transition Seats to BOOKED
        App->>Mongo: updateMany(show_seats, { showId, seatId: { $in: seatIds }, status: "LOCKED" }, { status: "BOOKED", bookingId })
        
        Note over App,Mongo: 4. Decrement Realtime Available Seats Counter
        App->>Mongo: updateOne(shows, { _id: showId }, { $inc: { availableSeats: -seats.length } })
        
        App->>Mongo: session.commitTransaction()
    end

    App->>Redis: Release Redis temporary locks (DEL lock:show:X:seat:Y)
    Note over App: Transaction committed successfully. Enqueue background PDF generation.
```

### Invariant Checks Inside the Transaction
If `show_seats.updateMany` modifies fewer documents than `seatIds.length` (indicating that one of the seats was tampered with or released), the service executes `session.abortTransaction()`. The booking transitions to `FAILED` and an automated full refund is queued.

---

## 3. Deep Dive: Booking Cancellation & Refund Transaction

```mermaid
sequenceDiagram
    autonumber
    participant App as Backend Service
    participant Mongo as MongoDB Replica Set
    participant Razorpay as Razorpay API

    App->>Mongo: session.startTransaction({ writeConcern: "majority" })

    rect rgb(255, 245, 245)
        Note over App,Mongo: 1. Transition Booking to CANCELLED
        App->>Mongo: updateOne(bookings, { _id: bookingId, status: "CONFIRMED" }, { status: "CANCELLED", cancellation })
        
        Note over App,Mongo: 2. Release Seats back to AVAILABLE
        App->>Mongo: updateMany(show_seats, { showId, bookingId }, { status: "AVAILABLE", bookingId: null, lockedByUserId: null })
        
        Note over App,Mongo: 3. Increment Show Available Counter
        App->>Mongo: updateOne(shows, { _id: showId }, { $inc: { availableSeats: seats.length } })
        
        Note over App,Mongo: 4. Insert Ledger Record into refunds
        App->>Mongo: insertOne(refunds, { bookingId, refundAmount, status: "PENDING" })
        
        App->>Mongo: session.commitTransaction()
    end

    App->>Razorpay: POST /v1/payments/:id/refund (Trigger Gateway Payout)
```

---

## 4. Transient Transaction Error Handling & Retry Policies

In high-concurrency environments, MongoDB transactions can encounter **TransientTransactionError** (e.g. WriteConflict errors when two transactions touch the same document, or network glitches during replica step-down).

### Exponential Backoff Retry Pattern
```typescript
// Production Transaction Execution Wrapper
export const runInTransaction = async <T>(
  operation: (session: ClientSession) => Promise<T>,
  maxRetries = 3
): Promise<T> => {
  const session = await mongoose.startSession();
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      session.startTransaction({
        readPreference: 'primary',
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority', j: true }
      });

      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error: any) {
      await session.abortTransaction();

      // Check if MongoDB labels this error as transient
      const isTransient = error.hasErrorLabel?.('TransientTransactionError');
      attempt++;

      if (isTransient && attempt < maxRetries) {
        // Exponential jittered backoff: 50ms, 150ms, 450ms
        const delay = Math.pow(3, attempt) * 50 + Math.random() * 50;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    } finally {
      if (attempt >= maxRetries || !session.inTransaction()) {
        await session.endSession();
      }
    }
  }
  throw new Error('Transaction failed after maximum retries');
};
```

---

## 5. Idempotency Guarantees Across Transactions

Every transactional operation accepts a client-provided or gateway-derived **Idempotency Key**:
- For Webhooks: `eventId` (from Razorpay).
- For Payments: `razorpay_order_id`.
- For Cancellations: `bookingReference + "-cancel"`.

Before executing the transaction, the service queries whether a completed record with that idempotency key already exists. If found, the prior result is returned immediately without re-executing mutations.

