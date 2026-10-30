import { jest } from '@jest/globals';
import BookingExpirationService from '../../src/modules/bookings/booking-expiration.service.js';
import { bookingRepository } from '../../src/modules/bookings/booking.repository.js';
import { BookingStatus } from '../../src/modules/bookings/booking.constants.js';
import redisConfig from '../../src/config/redis.js';

describe('BookingExpirationService Unit Tests', () => {
  let mockRedisClient;

  beforeEach(() => {
    mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      zadd: jest.fn().mockResolvedValue(1),
      zrem: jest.fn().mockResolvedValue(1),
      zrangebyscore: jest.fn().mockResolvedValue([])
    };
    jest.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedisClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should expire a pending booking whose payment window has elapsed', async () => {
    const expiredBooking = {
      _id: '65f1a2b3c4d5e6f7a8b9c001',
      bookingReference: 'BK-20261030-ABC123',
      status: BookingStatus.PENDING_PAYMENT,
      customerId: '65f1a2b3c4d5e6f7a8b9c002',
      showId: '65f1a2b3c4d5e6f7a8b9c003',
      seats: [{ seatId: '65f1a2b3c4d5e6f7a8b9c004', seatLabel: 'A1' }],
      expiresAt: new Date(Date.now() - 1000) // already elapsed
    };

    jest.spyOn(bookingRepository, 'findById').mockResolvedValue(expiredBooking);
    jest.spyOn(bookingRepository, 'updateStatus').mockResolvedValue({
      ...expiredBooking,
      status: BookingStatus.EXPIRED
    });

    const result = await BookingExpirationService.expireBooking('65f1a2b3c4d5e6f7a8b9c001');

    expect(result).toBe(true);
    expect(bookingRepository.updateStatus).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.zrem).toHaveBeenCalled();
  });

  it('should NOT expire a booking that has already been confirmed by payment', async () => {
    const confirmedBooking = {
      _id: '65f1a2b3c4d5e6f7a8b9c001',
      status: BookingStatus.CONFIRMED,
      expiresAt: new Date(Date.now() - 1000)
    };

    jest.spyOn(bookingRepository, 'findById').mockResolvedValue(confirmedBooking);
    const updateSpy = jest.spyOn(bookingRepository, 'updateStatus');

    const result = await BookingExpirationService.expireBooking('65f1a2b3c4d5e6f7a8b9c001');

    expect(result).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('should NOT expire a booking if payment window has not yet reached expiration', async () => {
    const activePendingBooking = {
      _id: '65f1a2b3c4d5e6f7a8b9c001',
      status: BookingStatus.PENDING_PAYMENT,
      expiresAt: new Date(Date.now() + 180 * 1000) // 3 minutes remaining
    };

    jest.spyOn(bookingRepository, 'findById').mockResolvedValue(activePendingBooking);
    const updateSpy = jest.spyOn(bookingRepository, 'updateStatus');

    const result = await BookingExpirationService.expireBooking('65f1a2b3c4d5e6f7a8b9c001');

    expect(result).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

