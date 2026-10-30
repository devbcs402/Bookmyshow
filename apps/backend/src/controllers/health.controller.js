import config from '../config/env.js';
import { getDatabaseHealth } from '../config/database.js';
import { getRedisHealth } from '../config/redis.js';
import ApiResponse from '../common/responses/api-response.js';
import HttpStatus from '../common/constants/http-status.js';
import ErrorCodes from '../common/constants/error-codes.js';

export class HealthController {
  static async getHealth(req, res) {
    const dbHealth = await getDatabaseHealth();
    const redisHealth = await getRedisHealth();

    const isSystemHealthy =
      (dbHealth.isHealthy || config.NODE_ENV === 'test') &&
      (redisHealth.isHealthy || config.NODE_ENV === 'test');
    const statusCode = isSystemHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    const mem = process.memoryUsage();

    return ApiResponse.success(res, {
      statusCode,
      message: isSystemHealthy
        ? 'System is fully operational'
        : 'System is degraded: one or more dependencies unavailable',
      data: {
        status: isSystemHealthy ? 'HEALTHY' : 'DEGRADED',
        environment: config.NODE_ENV,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        process: {
          nodeVersion: process.version,
          platform: process.platform,
          memoryUsageMB: {
            rss: Math.round(mem.rss / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024)
          }
        },
        dependencies: {
          database: {
            status: dbHealth.status,
            isHealthy: dbHealth.isHealthy,
            latencyMs: dbHealth.latencyMs
          },
          redis: {
            status: redisHealth.status,
            isHealthy: redisHealth.isHealthy,
            latencyMs: redisHealth.latencyMs
          }
        }
      }
    });
  }

  static async getLiveness(req, res) {
    return ApiResponse.success(res, {
      statusCode: HttpStatus.OK,
      message: 'Service is alive',
      data: {
        status: 'UP',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      }
    });
  }

  static async getReadiness(req, res) {
    const dbHealth = await getDatabaseHealth();
    const redisHealth = await getRedisHealth();

    const isReady =
      (dbHealth.isHealthy || config.NODE_ENV === 'test') &&
      (redisHealth.isHealthy || config.NODE_ENV === 'test');
    const statusCode = isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return ApiResponse.success(res, {
      statusCode,
      message: isReady
        ? 'Service is ready to accept traffic'
        : 'Service is not ready: dependencies are unavailable',
      data: {
        status: isReady ? 'READY' : 'NOT_READY',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbHealth.isHealthy,
          redis: redisHealth.isHealthy
        }
      }
    });
  }

  static async getMetrics(req, res) {
    if (!config.METRICS_ENABLED) {
      return ApiResponse.error(res, {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Metrics endpoint is disabled by configuration',
        errorCode: ErrorCodes.FORBIDDEN,
        requestId: req.id
      });
    }

    const token = req.headers['x-metrics-token'] || req.query.token;
    if (config.NODE_ENV === 'production' && token !== config.INTERNAL_METRICS_TOKEN) {
      return ApiResponse.error(res, {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Unauthorized: Invalid or missing metrics authentication token',
        errorCode: ErrorCodes.UNAUTHORIZED,
        requestId: req.id
      });
    }

    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    return ApiResponse.success(res, {
      statusCode: HttpStatus.OK,
      message: 'Operational metrics retrieved successfully',
      data: {
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        process: {
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        },
        memory: {
          rssMB: Math.round(mem.rss / 1024 / 1024),
          heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
          heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
          externalMB: Math.round(mem.external / 1024 / 1024)
        },
        cpu: {
          userMicroseconds: cpu.user,
          systemMicroseconds: cpu.system
        }
      }
    });
  }
}

export default HealthController;
