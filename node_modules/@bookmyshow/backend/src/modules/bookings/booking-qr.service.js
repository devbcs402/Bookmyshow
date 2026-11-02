import crypto from 'crypto';
import config from '../../config/env.js';
import { AppError } from '../../common/errors/app.error.js';
import HttpStatus from '../../common/constants/http-status.js';
import ErrorCodes from '../../common/constants/error-codes.js';

export class BookingQrService {
  /**
   * Generates a tamper-proof cryptographically signed verification payload for ticket QR codes.
   * Format: <base64url(header+claims)>.<hmac_sha256_signature>
   *
   * @param {Object} booking Booking document
   * @returns {string} Signed verification string
   */
  static generateQrPayload(booking) {
    const claims = {
      v: 1, // Version
      ref: booking.bookingReference,
      bid: booking._id ? booking._id.toString() : '',
      cid: booking.customerId ? booking.customerId.toString() : '',
      sid: booking.showId ? booking.showId.toString() : '',
      seats: (booking.seats || []).map(s => s.seatLabel),
      // Valid until 12 hours after show start
      exp: Math.floor(
        (new Date(booking.snapshot?.showStartTime || Date.now()).getTime() + 12 * 3600 * 1000) /
          1000
      )
    };

    const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', config.JWT_ACCESS_SECRET)
      .update(encodedClaims)
      .digest('base64url');

    return `BMS-QR.${encodedClaims}.${signature}`;
  }

  /**
   * Verifies the cryptographic signature and freshness of a scanned ticket QR code.
   *
   * @param {string} qrToken
   * @returns {Object} Decoded claims
   */
  static verifyQrPayload(qrToken) {
    if (!qrToken || typeof qrToken !== 'string') {
      throw new AppError(
        'Invalid QR token format',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_TICKET_TOKEN
      );
    }

    const parts = qrToken.split('.');
    if (parts.length !== 3 || parts[0] !== 'BMS-QR') {
      throw new AppError(
        'Malformed ticket verification token',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_TICKET_TOKEN
      );
    }

    const [, encodedClaims, signature] = parts;

    // Verify HMAC signature in constant time
    const expectedSignature = crypto
      .createHmac('sha256', config.JWT_ACCESS_SECRET)
      .update(encodedClaims)
      .digest('base64url');

    const expectedBuf = Buffer.from(expectedSignature);
    const actualBuf = Buffer.from(signature);

    if (
      expectedBuf.length !== actualBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, actualBuf)
    ) {
      throw new AppError(
        'Tampered or forged ticket verification token',
        HttpStatus.UNAUTHORIZED,
        ErrorCodes.INVALID_TICKET_TOKEN
      );
    }

    try {
      const claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8'));
      const nowSeconds = Math.floor(Date.now() / 1000);

      if (claims.exp && claims.exp < nowSeconds) {
        throw new AppError(
          'Ticket verification token has expired',
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TOKEN_EXPIRED
        );
      }

      return claims;
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(
        'Failed to parse ticket verification token',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_TICKET_TOKEN
      );
    }
  }

  /**
   * Builds clean, customer-facing ticket view.
   * @param {Object} booking
   * @returns {Object}
   */
  static buildTicketPayload(booking) {
    return {
      bookingReference: booking.bookingReference,
      status: booking.status,
      movie: {
        title: booking.snapshot?.movieTitle,
        posterUrl: booking.snapshot?.moviePosterUrl,
        format: booking.snapshot?.format,
        language: booking.snapshot?.language,
        censorRating: booking.snapshot?.censorRating
      },
      theatre: {
        name: booking.snapshot?.theatreName,
        address: booking.snapshot?.theatreAddress,
        screenName: booking.snapshot?.screenName
      },
      show: {
        startTime: booking.snapshot?.showStartTime,
        endTime: booking.snapshot?.showEndTime
      },
      seats: (booking.seats || []).map(s => ({
        seatLabel: s.seatLabel,
        rowLabel: s.rowLabel,
        columnNumber: s.columnNumber,
        categoryName: s.categoryName,
        unitPrice: s.unitPrice
      })),
      totalSeats: booking.totalSeats,
      netPayableAmount: booking.netPayableAmount,
      currency: booking.currency || 'INR',
      qrCodePayload: booking.qrCodePayload,
      isCheckedIn: booking.isCheckedIn || false
    };
  }
}

export default BookingQrService;
