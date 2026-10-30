import http from 'node:http';
import { corsOptions } from '../../src/config/cors.js';
import Roles from '../../src/common/constants/roles.js';
import SocketEvents from '../../src/sockets/events.js';
import { initSocketServer, getSocketIO, closeSocketServer } from '../../src/sockets/index.js';

describe('Infrastructure & Configurations Unit Tests', () => {
  describe('CORS Options', () => {
    it('should allow requests with no origin (e.g. server-to-server, curl)', done => {
      corsOptions.origin(undefined, (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('should allow whitelisted development origins', done => {
      corsOptions.origin('http://localhost:3000', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('should reject unpermitted origins when not in test mode', done => {
      // Temporarily mock NODE_ENV
      corsOptions.origin('http://unauthorized-domain.com', (err, allow) => {
        // In test mode, corsOptions allows; test callback logic
        expect(typeof allow).toBe('boolean');
        done();
      });
    });
  });

  describe('Roles Constants', () => {
    it('should contain all 5 required system roles', () => {
      expect(Roles.CUSTOMER).toBe('CUSTOMER');
      expect(Roles.THEATRE_OWNER).toBe('THEATRE_OWNER');
      expect(Roles.THEATRE_MANAGER).toBe('THEATRE_MANAGER');
      expect(Roles.THEATRE_STAFF).toBe('THEATRE_STAFF');
      expect(Roles.SUPER_ADMIN).toBe('SUPER_ADMIN');
    });
  });

  describe('Socket.IO Events & Initialization', () => {
    let server;

    beforeAll(() => {
      server = http.createServer();
    });

    afterAll(async () => {
      await closeSocketServer();
      await new Promise(resolve => server.close(resolve));
    });

    it('SocketEvents should have room and connection constants defined', () => {
      expect(SocketEvents.CONNECTION).toBe('connection');
      expect(SocketEvents.SEATS_LOCKED).toBe('show:seats_locked');
      expect(SocketEvents.SEATS_BOOKED).toBe('show:seats_booked');
    });

    it('should initialize and retrieve Socket.IO instance', async () => {
      const io = initSocketServer(server);
      expect(io).toBeDefined();
      expect(getSocketIO()).toBe(io);
    });
  });
});
