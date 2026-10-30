import { jest } from '@jest/globals';
import BookingReferenceService from '../../src/modules/bookings/booking-reference.service.js';

describe('BookingReferenceService Unit Tests', () => {
  it('should generate a reference with format BK-YYYYMMDD-XXXXXX', () => {
    const reference = BookingReferenceService.generateReference();
    expect(reference).toMatch(/^BK-\d{8}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });

  it('should generate unique reference without collision when checkExistsFn returns false', async () => {
    const checkExistsMock = jest.fn().mockResolvedValue(false);

    const ref = await BookingReferenceService.generateUniqueReference(checkExistsMock);

    expect(ref).toBeDefined();
    expect(checkExistsMock).toHaveBeenCalledTimes(1);
  });

  it('should retry generation if first candidate already exists', async () => {
    const checkExistsMock = jest
      .fn()
      .mockResolvedValueOnce(true) // Collision
      .mockResolvedValueOnce(false); // Success

    const ref = await BookingReferenceService.generateUniqueReference(checkExistsMock);

    expect(ref).toBeDefined();
    expect(checkExistsMock).toHaveBeenCalledTimes(2);
  });
});
