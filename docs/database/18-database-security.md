# 18. Database Security, Hardening & Compliance Architecture

## 1. Principle of Least Privilege: Role-Based Database Users

Application services never connect to MongoDB using the administrative `root` user. The cluster defines distinct database users with tightly scoped built-in roles:

```mermaid
graph TD
    AppWorker["Node.js API Workers"] -->|User: app_readwrite| RWRole["Role: readWrite on bookmyshow DB<br/>(Cannot create DBs, cannot drop collections)"]
    CronWorker["Reporting & Backup Worker"] -->|User: analytics_readonly| RORole["Role: read on bookmyshow DB<br/>(Strictly read-only access)"]
    AdminOps["DevOps DBA (Bastion Only)"] -->|User: cluster_admin| AdminRole["Role: clusterAdmin + dbAdmin<br/>(Index creation, maintenance)"]
```

### Database User Provisioning Script
```javascript
// Production Provisioning
db.createUser({
  user: "bms_app_user",
  pwd: passwordPrompt(),
  roles: [
    { role: "readWrite", db: "bookmyshow_production" }
  ]
});

db.createUser({
  user: "bms_analytics_user",
  pwd: passwordPrompt(),
  roles: [
    { role: "read", db: "bookmyshow_production" }
  ]
});
```

---

## 2. Network Isolation & Transport Security

```mermaid
flowchart LR
    Internet((Public Web)) -.->|Blocked| MongoSubnet["Isolated Private Subnet<br/>(No Public IP / No NAT Gateway)"]
    
    subgraph VPC ["Virtual Private Cloud (VPC)"]
        APIContainers["Node.js Backend Containers<br/>(Private Subnet 1)"]
        MongoCluster[("MongoDB Replica Set<br/>(Private Subnet 2)")]
    end

    APIContainers -->|TLS 1.3 / Strict Peer Verification| MongoCluster
```

1. **Zero Public Ingress**: MongoDB instances operate without public IP addresses inside an isolated VPC private subnet.
2. **Security Group White-listing**: Ingress to port `27017` is strictly restricted to the security group assigned to the backend ECS/Kubernetes cluster.
3. **Mandatory TLS 1.3 in Transit**:
   - Connection strings mandate SSL: `mongodb://user:pass@host1,host2/?ssl=true&tlsCertificateKeyFile=...&tlsCAFile=...`
   - Unencrypted plaintext traffic is rejected at the socket layer.

---

## 3. Encryption at Rest & Sensitive Field Cryptography

### 3.1 Storage-Level Encryption (FIPS 140-2 Compliant)
MongoDB WiredTiger storage engine utilizes **AES-256-CBC** encryption at rest across all underlying database files and temporary scratch disks, integrated with AWS KMS or HashiCorp Vault for automated master key management.

### 3.2 Application-Level Field Encryption (Envelope Encryption)
Sensitive PII (Personally Identifiable Information) and partner financial credentials undergo client-side encryption before writing to MongoDB:
- **Partner Bank Account Numbers**: Encrypted using **AES-256-GCM** with a dynamic 12-byte initialization vector (IV) and authentication tag.
- **Passwords**: Never encrypted with reversible ciphers; hashed using **Argon2id**.
- **Customer Phone & Email**: Plaintext strings for query matching, masked in all logging, reporting, and dashboard displays (`"r******@example.com"`, `"+91 XXXXXX3210"`).

---

## 4. PII Protection & Data Privacy Compliance (DPDP / GDPR)

Under digital personal data protection mandates:
1. **Right to Access**: Customer data retrieval queries export user profile, wishlists, and booking snapshots in encrypted JSON.
2. **Right to Erasure (Anonymization)**:
   - When an account erasure request is verified, personal identity in `users` is scrubbed:
     ```typescript
     await UserModel.updateOne(
       { _id: userId },
       {
         $set: {
           name: "Deleted User",
           email: `anonymized_${userId}@deleted.bms`,
           phone: null,
           passwordHash: "REVOKED",
           isActive: false,
           deletedAt: new Date()
         }
       }
     );
     ```
   - Historical records in `bookings` and `payments` are **retained** for statutory corporate tax compliance, but customer PII attributes are disassociated.

---

## 5. Security Audit Logging & Immutable Forensics

The `audit_logs` collection is protected by strict application-level and database-level invariants:
- **Write-Only**: Application services only possess `insertOne` privileges on `audit_logs`.
- **Zero Update / Delete Hooks**: Mongoose middleware rejects any `update`, `findOneAndUpdate`, or `delete` operation directed at `audit_logs`.
- **Append-Only Retention**: Logs are archived to S3 Glacier for 7 years to satisfy regulatory compliance.

