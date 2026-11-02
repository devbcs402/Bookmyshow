import request from 'supertest';
import { createTestApp } from '../helpers/test-server.js';

describe('Health Endpoints Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/v1/health/live', () => {
    it('should return 200 OK with process liveness status', async () => {
      const response = await request(app)
        .get('/api/v1/health/live')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('UP');
      expect(typeof response.body.data.uptimeSeconds).toBe('number');
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return 200 OK in test mode', async () => {
      const response = await request(app)
        .get('/api/v1/health/ready')
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('READY');
      expect(response.body.data.checks).toBeDefined();
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return system status with dependencies summary', async () => {
      const response = await request(app).get('/api/v1/health').expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data.environment).toBe('test');
      expect(response.body.data.dependencies).toBeDefined();
      expect(response.body.data.dependencies.database).toBeDefined();
      expect(response.body.data.dependencies.redis).toBeDefined();
    });
  });
});
