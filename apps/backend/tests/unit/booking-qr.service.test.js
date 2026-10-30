import BookingQrService from '../../src/modules/bookings/booking-qr.service.js';
import { AppError } from '../../src/common/errors/app.error.js';

describe('BookingQrService Unit Tests', () => {
  const mockBooking = {
    _id: '65f1a2b3c4d5e6f7a8b9c001',
    bookingReference: 'BK-20261030-ABC123',
    customerId: '65f1a2b3c4d5e6f7a8b9c002',
    showId: '65f1a2b3c4d5e6f7a8b9c003',
    seats: [{ seatLabel: 'A1' }, { seatLabel: 'A2' }],
    snapshot: {
      showStartTime: new Date(Date.now() + 2 * 3600 * 1000)
    }
  };

  it('should generate a valid cryptographically signed QR token', () => {
    const token = BookingQrService.generateQrPayload(mockBooking);

    expect(token).toBeDefined();
    expect(token.startsWith('BMS-QR.')).toBe(true);

    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('should successfully verify a genuine QR token and extract claims', () => {
    const token = BookingQrService.generateQrPayload(mockBooking);
    const claims = BookingQrService.verifyQrPayload(token);

    expect(claims.ref).toBe('BK-20261030-ABC123');
    expect(claims.seats).toEqual(['A1', 'A2']);
    expect(claims.bid).toBe('65f1a2b3c4d5e6f7a8b9c001');
  });

  it('should reject a forged or tampered token', () => {
    const validToken = BookingQrService.generateQrPayload(mockBooking);
    const parts = validToken.split('.');
    // Tamper with payload
    const tamperedToken = `${parts[0]}.${parts[1]}abc.${parts[2]}`;

    expect(() => BookingQrService.verifyQrPayload(tamperedToken)).toThrow(AppError);
  });

  it('should reject malformed or non-string tokens', () => {
    expect(() => BookingQrService.verifyQrPayload('invalid-token')).toThrow(AppError);
    expect(() => BookingQrService.verifyQrPayload(null)).toThrow(AppError);
  });
});

