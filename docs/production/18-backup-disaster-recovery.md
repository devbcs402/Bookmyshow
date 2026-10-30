# Backup, Disaster Recovery & Financial Data Reconciliation Runbook
**Document Reference**: `docs/production/18-backup-disaster-recovery.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Senior Infrastructure Architect, Database Administrator, Security Engineer  
**Status**: APPROVED RUNBOOK  

---

## 1. Core Principles & Source of Truth

In a transactional movie ticketing ecosystem:
1. **MongoDB is the Durable Source of Truth**: All confirmed bookings, customer profiles, theatre configurations, audit logs, and verified Razorpay payment records reside permanently in MongoDB.
2. **Redis Holds Ephemeral Coordination State**: Redis manages active seat-lock countdowns (300 seconds), rate limits, and short-lived query caches. Restoring Redis alone does **not** recover transaction state.
3. **Financial Reconcilability**: In any disaster scenario, payment gateway records from Razorpay must be cross-reconciled against recovered MongoDB booking records to guarantee zero lost customer funds.

---

## 2. Recovery Objectives

- **Recovery Point Objective (RPO)**: **< 5 minutes** (Continuous Oplog tailing in MongoDB Atlas; 1-second AOF sync in Redis).
- **Recovery Time Objective (RTO)**: **< 30 minutes** (Automated point-in-time cluster restore and container pod restart).

---

## 3. Backup Strategy & Schedules

### 3.1 MongoDB Database Backups
- **Continuous Backups**: MongoDB Atlas Point-In-Time Restore (PITR) with continuous oplog streaming.
- **Daily Snapshots**: Automated snapshots taken at 02:00 UTC, retained for 30 days in encrypted Amazon S3 / GCP Cloud Storage buckets.
- **Monthly Archives**: Monthly cold-storage snapshots retained for 7 years to satisfy corporate financial audit requirements.
- **Encryption**: Client-side and server-side encryption via AWS KMS / Google Cloud KMS (AES-256).
- **Manual CLI Backup Script**:
  ```bash
  mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/bms_prod" \
    --archive="bms_prod_backup_$(date +%Y%m%d_%H%M%S).gz" --gzip
  ```

### 3.2 Redis Cache Persistence
- **AOF (Append Only File)**: Enabled with `appendfsync everysec`.
- **RDB Hourly Snapshots**: Compressed `.rdb` state persisted to persistent EBS volumes.

---

## 4. Disaster Recovery & Restoration Procedure

### Phase 1: Infrastructure Spin-Up
1. Provision replacement VPC and Kubernetes / ECS cluster via Terraform infrastructure-as-code.
2. Ensure network security groups restrict MongoDB and Redis ingress strictly to the backend API subnet.

### Phase 2: Database Restoration
1. Trigger Point-In-Time Restore to the exact timestamp immediately preceding the disaster event:
   ```bash
   mongorestore --uri="mongodb+srv://user:pass@new-cluster.mongodb.net/bms_prod" \
     --archive="bms_prod_backup_target.gz" --gzip --drop
   ```
2. Verify collection counts and compound index integrity (`db.bookings.getIndexes()`).

### Phase 3: Redis Cold Start & Lock Flushing
1. Redis instances are initialized cleanly.
2. Because Redis seat locks are ephemeral (300s), flushing temporary lock keys upon recovery is strictly safer than restoring stale lock tokens, as any unconfirmed booking expired during the outage window.

---

## 5. Post-Recovery Financial & Seat Reconciliation Runbook

Following database restore, the operational team executes the payment reconciliation job:

1. **Invoke Reconciliation Worker**:
   ```bash
   node src/modules/payments/payment-reconciliation.service.js --mode=recovery --windowHours=24
   ```
2. **Execution Steps**:
   - Fetches all payments captured in Razorpay within the last 24 hours.
   - Cross-checks each `razorpay_payment_id` against recovered MongoDB booking documents.
   - If a customer was charged by Razorpay but the corresponding booking is in `PENDING_PAYMENT` or `EXPIRED` status due to outage timing, the script automatically:
     1. Transitions payment status to `REFUND_REQUIRED`.
     2. Dispatches an automated Razorpay partial/full refund API call.
     3. Notifies the customer via SMS/Email regarding the automated refund.
3. **Seat Consistency Check**:
   - Confirms that no seat within any future show has duplicate confirmed reservations (`db.bookings.aggregate([...])`).

