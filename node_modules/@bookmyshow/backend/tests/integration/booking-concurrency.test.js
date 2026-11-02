import { jest } from '@jest/globals';
import { BookingService, bookingService } from '../../src/modules/bookings/booking.service.js';
import BookingExpirationService from '../../src/modules/bookings/booking-expiration.service.js';
import { bookingRepository } from '../../src/modules/bookings/booking.repository.js';
import { BookingStatus } from '../../src/modules/bookings/booking.constants.js';
import Show from '../../src/modules/shows/show.model.js';
import Seat from '../../src/modules/screens/seat/seat.model.js';
import Theatre from '../../src/modules/theatres/model/theatre.model.js';
import Screen from '../../src/modules/screens/screen.model.js';
import redisConfig from '../../src/config/redis.js';
import { AppError } from '../../src/common/errors/app.error.js';

describe('Booking Concurrency, Consistency & Race Condition Tests', () => {
  let mockRedisClient;

  const mockUser1 = '65f1a2b3c4d5e6f7a8b9c001';
  const mockUser2 = '65f1a2b3c4d5e6f7a8b9c002';
  const mockShowId = '65f1a2b3c4d5e6f7a8b9c010';
  const mockSeatA1 = '65f1a2b3c4d5e6f7a8b9c0a1';
  const mockSeatA2 = '65f1a2b3c4d5e6f7a8b9c0a2';
  const mockSeatA3 = '65f1a2b3c4d5e6f7a8b9c0a3';

  const mockShowDoc = {
    _id: mockShowId,
    status: 'PUBLISHED',
    startTime: new Date(Date.now() + 3600 * 1000),
    endTime: new Date(Date.now() + 7200 * 1000),
    partnerId: '65f1a2b3c4d5e6f7a8b9c0p1',
    theatreId: '65f1a2b3c4d5e6f7a8b9c0t1',
    screenId: '65f1a2b3c4d5e6f7a8b9c0s1',
    movieId: '65f1a2b3c4d5e6f7a8b9c0m1',
    layoutVersion: 1,
    pricingTiers: [
      {
        categoryCode: 'RECLINER',
        categoryName: 'Royal Recliner',
        basePrice: 500,
        convenienceFee: 30,
        taxPercent: 18,
        effectivePrice: 535.4
      }
    ]
  };

  const mockPhysicalSeats = [
    {
      _id: mockSeatA1,
      seatLabel: 'A1',
      rowLabel: 'A',
      columnNumber: 1,
      categoryCode: 'RECLINER',
      status: 'ACTIVE'
    },
    {
      _id: mockSeatA2,
      seatLabel: 'A2',
      rowLabel: 'A',
      columnNumber: 2,
      categoryCode: 'RECLINER',
      status: 'ACTIVE'
    },
    {
      _id: mockSeatA3,
      seatLabel: 'A3',
      rowLabel: 'A',
      columnNumber: 3,
      categoryCode: 'RECLINER',
      status: 'ACTIVE'
    }
  ];

  beforeEach(() => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      zadd: jest.fn().mockResolvedValue(1),
      zrem: jest.fn().mockResolvedValue(1)
    };
    jest.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedisClient);

    jest.spyOn(Show, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockShowDoc)
    });

    jest.spyOn(Seat, 'find').mockImplementation(query => ({
      lean: jest
        .fn()
        .mockResolvedValue(
          query?._id?.$in
            ? mockPhysicalSeats.filter(s => query._id.$in.includes(s._id))
            : mockPhysicalSeats
        )
    }));

    jest.spyOn(Theatre, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: '65f1a2b3c4d5e6f7a8b9c0t1',
        name: 'PVR ICON'
      })
    });

    jest.spyOn(Screen, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: '65f1a2b3c4d5e6f7a8b9c0s1',
        name: 'Audi 1'
      })
    });

    jest.spyOn(bookingRepository, 'existsByReference').mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Scenario 1 & 2: Concurrent Booking Creation for Competing Seats', () => {
    it('should allow only one booking to succeed when two requests attempt to reserve the same seat', async () => {
      // User 1 has valid lock on A1
      mockRedisClient.get.mockImplementation(key => {
        if (key.includes(mockSeatA1)) {
          return Promise.resolve(JSON.stringify({ userId: mockUser1, lockId: 'lock-u1' }));
        }
        return Promise.resolve(null);
      });

      // User 1 passes DB conflict check initially
      jest.spyOn(bookingRepository, 'findConflictingActiveBookings').mockResolvedValue([]);

      // Mock database insertion: First succeeds, second collides with MongoDB unique index
      let creationCount = 0;
      jest.spyOn(bookingRepository, 'create').mockImplementation(doc => {
        creationCount++;
        if (creationCount > 1) {
          const err = new Error(
            'E11000 duplicate key error collection: bookings index: uniq_active_show_seat_reservation'
          );
          err.code = 11000;
          throw err;
        }
        return Promise.resolve({
          ...doc,
          _id: '65f1a2b3c4d5e6f7a8b9c099'
        });
      });

      // User 1 attempt
      const result1 = await bookingService.createBooking(mockUser1, {
        showId: mockShowId,
        seatIds: [mockSeatA1]
      });

      expect(result1).toBeDefined();
      expect(result1.status).toBe(BookingStatus.PENDING_PAYMENT);

      // Concurrent User 2 attempt for same seat (even if User 2 bypasses Redis or has race condition)
      await expect(
        bookingService.createBooking(mockUser2, {
          showId: mockShowId,
          seatIds: [mockSeatA1]
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('Scenario 3: Partial Booking Prevention', () => {
    it('should fail the entire booking when any single seat in multi-seat request is already booked', async () => {
      // User 1 requests [A1, A2, A3], but A2 is already booked in MongoDB
      mockRedisClient.get.mockImplementation(_key => {
        return Promise.resolve(JSON.stringify({ userId: mockUser1, lockId: 'lock-u1' }));
      });

      jest.spyOn(bookingRepository, 'findConflictingActiveBookings').mockResolvedValue([
        {
          _id: 'existing-booking',
          bookingReference: 'BK-EXISTING',
          seats: [{ seatId: mockSeatA2 }]
        }
      ]);

      const createSpy = jest.spyOn(bookingRepository, 'create');

      await expect(
        bookingService.createBooking(mockUser1, {
          showId: mockShowId,
          seatIds: [mockSeatA1, mockSeatA2, mockSeatA3]
        })
      ).rejects.toThrow(AppError);

      // Verify that no booking record was ever created
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 4: Duplicate Network Request Idempotency', () => {
    it('should return original booking when identical request is sent with same idempotency key', async () => {
      const existingCachedBooking = {
        _id: '65f1a2b3c4d5e6f7a8b9c099',
        bookingReference: 'BK-ORIGINAL-123',
        status: BookingStatus.PENDING_PAYMENT
      };

      const payloadFingerprint = BookingService.hashPayload(mockShowId, [mockSeatA1]);

      // Mock Redis returning cached response for idempotency key
      mockRedisClient.get.mockResolvedValue(
        JSON.stringify({
          fingerprint: payloadFingerprint,
          booking: existingCachedBooking
        })
      );

      const createSpy = jest.spyOn(bookingRepository, 'create');

      const result = await bookingService.createBooking(
        mockUser1,
        {
          showId: mockShowId,
          seatIds: [mockSeatA1]
        },
        'idempotency-token-xyz'
      );

      expect(result).toBeDefined();
      expect(result.bookingReference).toBe('BK-ORIGINAL-123');
      // Did not insert duplicate record in database
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should reject with 409 Conflict if idempotency key is reused with a different payload', async () => {
      // Cached fingerprint was for A1
      const originalFingerprint = BookingService.hashPayload(mockShowId, [mockSeatA1]);

      mockRedisClient.get.mockResolvedValue(
        JSON.stringify({
          fingerprint: originalFingerprint,
          booking: { _id: 'some-booking' }
        })
      );

      // Caller sends A2 with same idempotency key
      await expect(
        bookingService.createBooking(
          mockUser1,
          {
            showId: mockShowId,
            seatIds: [mockSeatA2]
          },
          'idempotency-token-xyz'
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe('Scenario 5: Payment and Expiration Race Resolution', () => {
    it('should refuse to expire a booking that has been transitioned to CONFIRMED', async () => {
      const confirmedBooking = {
        _id: '65f1a2b3c4d5e6f7a8b9c099',
        status: BookingStatus.CONFIRMED,
        expiresAt: new Date(Date.now() - 5000)
      };

      jest.spyOn(bookingRepository, 'findById').mockResolvedValue(confirmedBooking);
      const updateSpy = jest.spyOn(bookingRepository, 'updateStatus');

      const expired = await BookingExpirationService.expireBooking('65f1a2b3c4d5e6f7a8b9c099');

      expect(expired).toBe(false);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
});
