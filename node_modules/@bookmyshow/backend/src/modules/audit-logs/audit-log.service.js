import AuditLogRepository from './audit-log.repository.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';

export class AuditLogService {
  static async getAuditLogs(queryFilters) {
    return AuditLogRepository.findLogs(queryFilters);
  }

  static async getAuditLogById(auditLogId) {
    const log = await AuditLogRepository.findById(auditLogId);
    if (!log) {
      throw new NotFoundError(`Audit log with ID '${auditLogId}' not found`);
    }
    return log;
  }

  static async logAdminAction({
    actorId,
    actorRole,
    action,
    targetResource,
    targetId,
    details,
    ipAddress,
    userAgent
  }) {
    return AuditLogRepository.createLog({
      actorId,
      actorRole,
      action,
      targetResource,
      targetId,
      details,
      ipAddress,
      userAgent
    });
  }
}

export default AuditLogService;
