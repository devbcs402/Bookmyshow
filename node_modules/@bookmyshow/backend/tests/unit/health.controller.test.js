import HealthController from '../../src/controllers/health.controller.js';

describe('HealthController Unit Tests', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      id: 'mock-req-uuid-1234',
      headers: {},
      query: {}
    };

    mockRes = {
      statusCode: null,
      responseData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.responseData = data;
        return this;
      }
    };
  });

  describe('getHealth', () => {
    it('should return 200 OK with system status, process memory, and dependencies', async () => {
      await HealthController.getHealth(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.responseData.success).toBe(true);
      expect(mockRes.responseData.data.status).toBe('HEALTHY');
      expect(mockRes.responseData.data.process).toBeDefined();
      expect(mockRes.responseData.data.process.memoryUsageMB).toBeDefined();
      expect(mockRes.responseData.data.dependencies).toBeDefined();
    });
  });

  describe('getLiveness', () => {
    it('should return 200 OK with status UP', async () => {
      await HealthController.getLiveness(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.responseData.success).toBe(true);
      expect(mockRes.responseData.data.status).toBe('UP');
      expect(typeof mockRes.responseData.data.uptimeSeconds).toBe('number');
    });
  });

  describe('getReadiness', () => {
    it('should return 200 OK with status READY in test environment', async () => {
      await HealthController.getReadiness(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.responseData.success).toBe(true);
      expect(mockRes.responseData.data.status).toBe('READY');
      expect(mockRes.responseData.data.checks).toBeDefined();
    });
  });

  describe('getMetrics', () => {
    it('should return 200 OK with process memory and CPU metrics', async () => {
      await HealthController.getMetrics(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.responseData.success).toBe(true);
      expect(mockRes.responseData.data.memory).toBeDefined();
      expect(mockRes.responseData.data.memory.rssMB).toBeGreaterThan(0);
      expect(mockRes.responseData.data.cpu).toBeDefined();
    });
  });
});

