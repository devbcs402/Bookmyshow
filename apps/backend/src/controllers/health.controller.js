import config from '../config/env.js';
import { getDatabaseHealth } from '../config/database.js';
import { getRedisHealth } from '../config/redis.js';
import ApiResponse from '../common/responses/api-response.js';
import HttpStatus from '../common/constants/http-status.js';

export class HealthController {
  static async getHealth(req, res) {
    const dbHealth = await getDatabaseHealth();
    const redisHealth = await getRedisHealth();

    const isSystemHealthy =
      (dbHealth.isHealthy || config.NODE_ENV === 'test') &&
      (redisHealth.isHealthy || config.NODE_ENV === 'test');
    const statusCode = isSystemHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

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
}

export default HealthController;
