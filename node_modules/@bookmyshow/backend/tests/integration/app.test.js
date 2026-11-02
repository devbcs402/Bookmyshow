import request from 'supertest';
import { createTestApp } from '../helpers/test-server.js';

describe('Express Application Global Middleware Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('404 Route Not Found', () => {
    it('should return 404 with structured error envelope for non-existent route', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-endpoint-abc')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.message).toContain('does not exist');
      expect(response.body.requestId).toBeDefined();
    });
  });

  describe('Security Headers (Helmet)', () => {
    it('should set essential HTTP security headers', async () => {
      const response = await request(app).get('/api/v1/health/live');

      expect(response.headers['x-dns-prefetch-control']).toBe('off');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Malformed JSON Body Handling', () => {
    it('should catch malformed JSON and respond with 400 Bad Request', async () => {
      const response = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send('{"invalidJson": unquotedString')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MALFORMED_JSON');
    });
  });

  describe('Interactive API Documentation', () => {
    it('should redirect or serve HTML on Swagger documentation endpoint', async () => {
      const response = await request(app).get('/api/v1/docs/').expect(200);

      expect(response.text).toContain('swagger-ui');
    });
  });
});
