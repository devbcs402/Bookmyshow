import { jest } from '@jest/globals';
import BookingService from '../../src/modules/bookings/booking.service.js';
import { bookingRepository } from '../../src/modules/bookings/booking.repository.js';
import Show from '../../src/modules/shows/show.model.js';
import redisConfig from '../../src/config/redis.js';
import { AppError } from '../../src/common/errors/app.error.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';

describe('BookingService Unit Tests', () => {
  let mockRedisClient;
  const mockCustomerId = '65f1a2b3c4d5e6f7a8b9c001';
  const mockShowId = '65f1a2b3c4d5e6f7a8b9c002';
  const mockSeatId = '65f1a2b3c4d5e6f7a8b9c003';

  beforeEach(() => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      zadd: jest.fn().mockResolvedValue(1),
      zrem: jest.fn().mockResolvedValue(1)
    };
    jest.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedisClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createBooking', () => {
    it('should throw NotFoundError if show does not exist', async () => {
      jest.spyOn(Show, 'findById').mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      await expect(
        BookingService.createBooking(mockCustomerId, {
          showId: mockShowId,
          seatIds: [mockSeatId]
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw ConflictError if show is not published', async () => {
      jest.spyOn(Show, 'findById').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: mockShowId,
          status: 'DRAFT',
          startTime: new Date(Date.now() + 3600 * 1000)
        })
      });

      await expect(
        BookingService.createBooking(mockCustomerId, {
          showId: mockShowId,
          seatIds: [mockSeatId]
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw ConflictError if show has already started', async () => {
      jest.spyOn(Show, 'findById').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: mockShowId,
          status: 'PUBLISHED',
          startTime: new Date(Date.now() - 3600 * 1000) // 1 hour ago
        })
      });

      await expect(
        BookingService.createBooking(mockCustomerId, {
          showId: mockShowId,
          seatIds: [mockSeatId]
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw ConflictError if seat lock does not exist in Redis', async () => {
      jest.spyOn(Show, 'findById').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: mockShowId,
          status: 'PUBLISHED',
          startTime: new Date(Date.now() + 3600 * 1000)
        })
      });

      // Redis lock missing
      mockRedisClient.get.mockResolvedValue(null);

      await expect(
        BookingService.createBooking(mockCustomerId, {
          showId: mockShowId,
          seatIds: [mockSeatId]
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw ForbiddenError if seat lock belongs to another customer', async () => {
      jest.spyOn(Show, 'findById').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: mockShowId,
          status: 'PUBLISHED',
          startTime: new Date(Date.now() + 3600 * 1000)
        })
      });

      // Redis lock belongs to someone else
      mockRedisClient.get.mockResolvedValue(
        JSON.stringify({
          userId: '65f1a2b3c4d5e6f7a8b9c999',
          lockId: 'lock-123'
        })
      );

      await expect(
        BookingService.createBooking(mockCustomerId, {
          showId: mockShowId,
          seatIds: [mockSeatId]
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw ConflictError if seat is already booked in MongoDB', async () => {
      jest.spyOn(Show, 'findById').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: mockShowId,
          status: 'PUBLISHED',
          startTime: new Date(Date.now() + 3600 * 1000)
        })
      });

      // Valid lock owned by caller
      mockRedisClient.get.mockResolvedValue(
        JSON.stringify({
          userId: mockCustomerId,
          lockId: 'lock-123'
        })
      );

      // Conflict in MongoDB
      jest.spyOn(bookingRepository, 'findConflictingActiveBookings').mockResolvedValue([
        {
          _id: 'existing-booking',
          seats: [{ seatId: mockSeatId }]
        }
      ]);

      await expect(
        BookingService.createBooking(mockCustomerId, {
          showId: mockShowId,
          seatIds: [mockSeatId]
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('getBookingById', () => {
    it('should return booking when requested by owner customer', async () => {
      const mockBooking = {
        _id: '65f1a2b3c4d5e6f7a8b9c001',
        customerId: mockCustomerId,
        bookingReference: 'BK-123',
        seats: [{ seatLabel: 'A1' }]
      };

      jest.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking);

      const result = await BookingService.getBookingById('65f1a2b3c4d5e6f7a8b9c001', {
        id: mockCustomerId,
        role: Roles.CUSTOMER
      });

      expect(result).toBeDefined();
      expect(result.bookingReference).toBe('BK-123');
    });

    it('should throw NotFoundError if customer tries to view another user booking (BOLA protection)', async () => {
      const mockBooking = {
        _id: '65f1a2b3c4d5e6f7a8b9c001',
        customerId: 'another-user-id',
        bookingReference: 'BK-123'
      };

      jest.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking);

      await expect(
        BookingService.getBookingById('65f1a2b3c4d5e6f7a8b9c001', {
          id: mockCustomerId,
          role: Roles.CUSTOMER
        })
      ).rejects.toThrow(AppError);
    });
  });
});
