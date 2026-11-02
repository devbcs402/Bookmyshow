import AuditLogService from './audit-log.service.js';
import ApiResponse from '../../common/responses/api-response.js';
import HttpStatus from '../../common/constants/http-status.js';

export class AuditLogController {
  static async getAuditLogs(req, res, next) {
    try {
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        actorId: req.query.actorId,
        action: req.query.action,
        targetResource: req.query.targetResource,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await AuditLogService.getAuditLogs(filters);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Audit logs retrieved successfully',
        data: result.logs,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogById(req, res, next) {
    try {
      const { auditLogId } = req.params;
      const log = await AuditLogService.getAuditLogById(auditLogId);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Audit log details retrieved successfully',
        data: log
      });
    } catch (err) {
      next(err);
    }
  }
}

export default AuditLogController;
