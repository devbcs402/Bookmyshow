import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null,
      index: true
    },
    actorRole: {
      type: String,
      default: 'ANONYMOUS'
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    targetResource: {
      type: String,
      default: 'auth'
    },
    targetId: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Append-only policy: Prevent updates or deletions on audit logs
auditLogSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'],
  function () {
    throw new Error('IMMUTABLE_AUDIT_LOG: Audit log records cannot be updated or deleted');
  }
);

auditLogSchema.index({ targetResource: 1, targetId: 1, timestamp: -1 });

export const AuditLog = mongoose.model('audit_logs', auditLogSchema);
export default AuditLog;
