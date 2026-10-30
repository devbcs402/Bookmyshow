import { jest } from '@jest/globals';
import paymentService from '../../src/modules/payments/payment.service.js';
import paymentRepository from '../../src/modules/payments/payment.repository.js';
import bookingRepository from '../../src/modules/bookings/booking.repository.js';
import { PaymentStatus } from '../../src/modules/payments/payment.constants.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { AppError } from '../../src/common/errors/app.error.js';

describe('Payment Tenant & Ownership Isolation Tests (BOLA/IDOR Defense)', () => {
  const customerA = { id: '65f1a2b3c4d5e6f7a8b9c001', role: Roles.CUSTOMER };
  const customerB = { id: '65f1a2b3c4d5e6f7a8b9c002', role: Roles.CUSTOMER };

  const ownerA = {
    id: '65f1a2b3c4d5e6f7a8b9c011',
    role: Roles.THEATRE_OWNER,
    partnerId: '65f1a2b3c4d5e6f7a8b9c0p1'
  };
  const ownerB = {
    id: '65f1a2b3c4d5e6f7a8b9c012',
    role: Roles.THEATRE_OWNER,
    partnerId: '65f1a2b3c4d5e6f7a8b9c0p2'
  };

  const mockPaymentDoc = {
    _id: '65f1a2b3c4d5e6f7a8b9c099',
    bookingId: '65f1a2b3c4d5e6f7a8b9c088',
    customerId: customerA.id,
    partnerId: ownerA.partnerId,
    status: PaymentStatus.CAPTURED,
    amount: 500,
    razorpayOrderId: 'order_123',
    razorpayPaymentId: 'pay_123'
  };

  beforeEach(() => {
    jest.spyOn(paymentRepository, 'findRefundsByPaymentId').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should block Customer B from viewing Customer A payment details (returns 404 BOLA protection)', async () => {
    jest.spyOn(paymentRepository, 'findById').mockResolvedValue(mockPaymentDoc);

    // Customer A succeeds
    const resultA = await paymentService.getPaymentDetails(mockPaymentDoc._id, customerA);
    expect(resultA._id).toBe(mockPaymentDoc._id);

    // Customer B fails with 404
    await expect(paymentService.getPaymentDetails(mockPaymentDoc._id, customerB)).rejects.toThrow(
      AppError
    );
  });

  it('should block Theatre Owner B from viewing Theatre Owner A payments', async () => {
    jest.spyOn(paymentRepository, 'findById').mockResolvedValue(mockPaymentDoc);

    // Owner A succeeds
    const resultA = await paymentService.getPaymentDetails(mockPaymentDoc._id, ownerA);
    expect(resultA._id).toBe(mockPaymentDoc._id);

    // Owner B fails with 404
    await expect(paymentService.getPaymentDetails(mockPaymentDoc._id, ownerB)).rejects.toThrow(
      AppError
    );
  });

  it('should block Theatre Owner B from initiating refund on Theatre Owner A payment', async () => {
    jest.spyOn(paymentRepository, 'findById').mockResolvedValue(mockPaymentDoc);

    await expect(
      paymentService.initiateRefund(mockPaymentDoc._id, ownerB, { amount: 500 })
    ).rejects.toThrow(AppError);
  });

  it('should block Customer B from querying booking payments of Customer A', async () => {
    jest.spyOn(bookingRepository, 'findById').mockResolvedValue({
      _id: '65f1a2b3c4d5e6f7a8b9c088',
      customerId: customerA.id,
      partnerId: ownerA.partnerId
    });

    await expect(
      paymentService.getBookingPayments('65f1a2b3c4d5e6f7a8b9c088', customerB)
    ).rejects.toThrow(AppError);
  });
});
