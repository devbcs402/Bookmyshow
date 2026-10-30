import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import AnalyticsRepository, {
  computeDateBoundaries
} from '../../src/modules/analytics/analytics.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import { TimeRange } from '../../src/modules/analytics/analytics.constants.js';

describe('Analytics Module Integration Tests', () => {
  let app;
  let superAdminToken;
  let ownerToken;
  let customerToken;

  const mockAdminId = '65f1a2b3c4d5e6f7a8b9c0a1';
  const mockOwnerId = '65f1a2b3c4d5e6f7a8b9c0o1';
  const mockCustomerId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0p1';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0s1';

  beforeAll(() => {
    app = createApp();

    superAdminToken = generateAccessToken({
      userId: mockAdminId,
      sessionId: mockSessionId,
      role: Roles.SUPER_ADMIN,
      partnerId: null
    });

    ownerToken = generateAccessToken({
      userId: mockOwnerId,
      sessionId: mockSessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: mockPartnerId
    });

    customerToken = generateAccessToken({
      userId: mockCustomerId,
      sessionId: mockSessionId,
      role: Roles.CUSTOMER,
      partnerId: null
    });
  });

  beforeEach(() => {
    jest.restoreAllMocks();

    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: mockSessionId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(userId => {
      if (userId === mockAdminId) {
        return Promise.resolve({
          _id: mockAdminId,
          role: Roles.SUPER_ADMIN,
          isActive: true
        });
      }
      if (userId === mockOwnerId) {
        return Promise.resolve({
          _id: mockOwnerId,
          role: Roles.THEATRE_OWNER,
          partnerId: mockPartnerId,
          isActive: true
        });
      }
      if (userId === mockCustomerId) {
        return Promise.resolve({
          _id: mockCustomerId,
          role: Roles.CUSTOMER,
          isActive: true
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('Date Boundaries Computation', () => {
    it('should compute valid boundaries for standard time ranges', () => {
      const ranges = [
        TimeRange.TODAY,
        TimeRange.YESTERDAY,
        TimeRange.LAST_7_DAYS,
        TimeRange.LAST_30_DAYS,
        TimeRange.THIS_MONTH,
        TimeRange.PREV_MONTH
      ];

      for (const range of ranges) {
        const { start, end } = computeDateBoundaries(range);
        expect(start instanceof Date).toBe(true);
        expect(end instanceof Date).toBe(true);
        expect(start.getTime()).toBeLessThan(end.getTime());
      }
    });

    it('should support custom date range boundaries', () => {
      const startStr = '2026-01-01T00:00:00.000Z';
      const endStr = '2026-01-15T23:59:59.999Z';
      const { start, end } = computeDateBoundaries(TimeRange.CUSTOM, startStr, endStr);
      expect(start.toISOString()).toBe(startStr);
      expect(end.toISOString()).toBe(endStr);
    });
  });

  describe('Admin Analytics: GET /api/v1/admin/analytics/overview', () => {
    it('should return 200 OK with platform overview for SUPER_ADMIN', async () => {
      const mockOverview = {
        period: {
          timeRange: '7d',
          startDate: '2026-10-23T00:00:00.000Z',
          endDate: '2026-10-30T00:00:00.000Z'
        },
        platform: {
          totalUsers: 150,
          activeUsers: 140,
          totalTheatres: 12,
          activeTheatres: 10,
          totalMovies: 8,
          publishedShows: 45
        },
        bookings: {
          total: 100,
          confirmed: 80,
          cancelled: 10,
          expired: 8,
          failed: 2,
          ticketsSold: 220
        },
        revenue: {
          currency: 'INR',
          grossBookingValue: 45000,
          capturedPaymentValue: 36000,
          refundValue: 4500,
          platformCommission: 3600,
          theatreSettlement: 27900,
          netPlatformRevenue: 3600
        }
      };

      jest.spyOn(AnalyticsRepository, 'getAdminOverview').mockResolvedValue(mockOverview);

      const response = await request(app)
        .get('/api/v1/admin/analytics/overview?timeRange=7d')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.platform.totalUsers).toBe(150);
      expect(response.body.data.revenue.capturedPaymentValue).toBe(36000);
      expect(response.body.data.revenue.theatreSettlement).toBe(27900);
    });

    it('should reject access with 403 Forbidden for CUSTOMER role', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics/overview')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should reject access with 403 Forbidden for THEATRE_OWNER role', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics/overview')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Admin Analytics: GET /api/v1/admin/analytics/bookings', () => {
    it('should return 200 OK with booking breakdown and daily trends', async () => {
      const mockBookings = {
        period: { timeRange: '7d' },
        summary: {
          total: 50,
          confirmed: 40,
          cancelled: 5,
          cancellationRatePercent: 10,
          avgSeatsPerConfirmedBooking: 2.5
        },
        statusBreakdown: { CONFIRMED: 40, CANCELLED: 5, EXPIRED: 5 },
        dailyTrend: [
          {
            date: '2026-10-29',
            total: 10,
            confirmed: 8,
            cancelled: 1,
            grossAmount: 4000,
            ticketsSold: 20
          }
        ]
      };

      jest.spyOn(AnalyticsRepository, 'getAdminBookings').mockResolvedValue(mockBookings);

      const response = await request(app)
        .get('/api/v1/admin/analytics/bookings?timeRange=7d')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.cancellationRatePercent).toBe(10);
      expect(response.body.data.dailyTrend.length).toBe(1);
    });
  });

  describe('Admin Analytics: GET /api/v1/admin/analytics/revenue', () => {
    it('should return 200 OK with accounting breakdown and definition transparency', async () => {
      const mockRevenue = {
        period: { timeRange: '7d' },
        accounting: {
          currency: 'INR',
          definitions: { grossBookingValue: 'Total value', netPlatformRevenue: 'Recognized' },
          grossBookingValue: 50000,
          capturedPaymentValue: 40000,
          refundValue: 3000,
          platformCommission: 4000,
          theatreSettlement: 33000,
          netPlatformRevenue: 4000
        },
        dailyRevenue: [
          {
            date: '2026-10-29',
            gross: 10000,
            captured: 8000,
            refunded: 500,
            commission: 800,
            settlement: 6700
          }
        ]
      };

      jest.spyOn(AnalyticsRepository, 'getAdminRevenue').mockResolvedValue(mockRevenue);

      const response = await request(app)
        .get('/api/v1/admin/analytics/revenue?timeRange=7d')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accounting.theatreSettlement).toBe(33000);
    });
  });

  describe('Admin Analytics: GET /api/v1/admin/analytics/movies & /theatres', () => {
    it('should return 200 OK with top movies ranked by tickets sold', async () => {
      jest.spyOn(AnalyticsRepository, 'getAdminMovies').mockResolvedValue({
        period: { timeRange: '7d' },
        movies: [
          {
            movieId: '65f1a2b3c4d5e6f7a8b9c0m1',
            title: 'Inception',
            confirmedBookings: 25,
            ticketsSold: 70,
            revenue: 21000
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/admin/analytics/movies?limit=5')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.movies[0].title).toBe('Inception');
    });

    it('should return 200 OK with top theatres ranked by gross revenue', async () => {
      jest.spyOn(AnalyticsRepository, 'getAdminTheatres').mockResolvedValue({
        period: { timeRange: '7d' },
        theatres: [
          {
            theatreId: '65f1a2b3c4d5e6f7a8b9c0e1',
            name: 'PVR Phoenix',
            confirmedBookings: 30,
            ticketsSold: 90,
            revenue: 32000
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/admin/analytics/theatres?limit=5')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.theatres[0].name).toBe('PVR Phoenix');
    });
  });

  describe('Theatre Owner Analytics (Tenant Isolation)', () => {
    it('should return isolated overview for authenticated THEATRE_OWNER', async () => {
      const mockOwnerOverview = {
        period: { timeRange: '7d' },
        partnerId: mockPartnerId,
        performance: {
          activePublishedShows: 12,
          totalBookings: 45,
          confirmedBookings: 40,
          cancelledBookings: 5,
          ticketsSold: 110
        },
        settlement: {
          currency: 'INR',
          grossSales: 22000,
          platformFeesDeducted: 2200,
          refundsDeducted: 1000,
          netPayableToPartner: 18800
        }
      };

      jest
        .spyOn(AnalyticsRepository, 'getTheatreOwnerOverview')
        .mockResolvedValue(mockOwnerOverview);

      const response = await request(app)
        .get('/api/v1/theatre-owner/analytics/overview?timeRange=7d')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.partnerId).toBe(mockPartnerId);
      expect(response.body.data.settlement.netPayableToPartner).toBe(18800);
    });

    it('should also work on alias route /api/v1/owner/analytics/overview', async () => {
      jest.spyOn(AnalyticsRepository, 'getTheatreOwnerOverview').mockResolvedValue({
        period: { timeRange: '7d' },
        partnerId: mockPartnerId,
        performance: { totalBookings: 10 },
        settlement: { netPayableToPartner: 5000 }
      });

      const response = await request(app)
        .get('/api/v1/owner/analytics/overview')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return isolated revenue breakdown for authenticated THEATRE_OWNER', async () => {
      jest.spyOn(AnalyticsRepository, 'getTheatreOwnerRevenue').mockResolvedValue({
        period: { timeRange: '7d' },
        partnerId: mockPartnerId,
        currency: 'INR',
        grossSales: 30000,
        platformFees: 3000,
        refunds: 1500,
        netSettlement: 25500
      });

      const response = await request(app)
        .get('/api/v1/theatre-owner/analytics/revenue')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.netSettlement).toBe(25500);
    });
  });
});
