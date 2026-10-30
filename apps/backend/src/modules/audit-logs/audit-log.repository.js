import { AuditLog } from '../auth/model/audit-log.model.js';

export class AuditLogRepository {
  static async createLog({
    actorId = null,
    actorRole = 'ANONYMOUS',
    action,
    targetResource = 'system',
    targetId = '',
    details = {},
    ipAddress = '',
    userAgent = ''
  }) {
    return AuditLog.create({
      actorId,
      actorRole,
      action,
      targetResource,
      targetId: String(targetId),
      details,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });
  }

  static async findLogs({
    actorId,
    action,
    targetResource,
    startDate,
    endDate,
    page = 1,
    limit = 20
  }) {
    const filter = {};

    if (actorId) {
      filter.actorId = actorId;
    }
    if (action) {
      filter.action = action;
    }
    if (targetResource) {
      filter.targetResource = targetResource;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorId', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async findById(id) {
    return AuditLog.findById(id).populate('actorId', 'name email role').lean();
  }
}

export default AuditLogRepository;
