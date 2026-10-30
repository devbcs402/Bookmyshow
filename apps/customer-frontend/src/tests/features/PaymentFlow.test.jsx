import { describe, it, expect, vi, beforeEach } from 'vitest';
import paymentsApi from '../../services/api/payments.api';

vi.mock('../../services/api/payments.api');

describe('Payment Gateway Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a Razorpay order from backend for a pending booking', async () => {
    paymentsApi.createPaymentOrder.mockResolvedValueOnce({
      success: true,
      data: {
        keyId: 'rzp_test_public_123',
        orderId: 'order_DBJOWzybf0sJbb',
        amount: 85000,
        currency: 'INR',
        bookingReference: 'BMS-REF-888',
        bookingId: 'booking-888'
      }
    });

    const res = await paymentsApi.createPaymentOrder('booking-888', 'idemp-pay-1');
    expect(res.data.orderId).toBe('order_DBJOWzybf0sJbb');
    expect(res.data.keyId).toBe('rzp_test_public_123');
    expect(res.data.amount).toBe(85000);
  });

  it('submits checkout response to backend verification endpoint', async () => {
    paymentsApi.verifyPayment.mockResolvedValueOnce({
      success: true,
      message: 'Payment verified and booking confirmed successfully',
      data: {
        bookingId: 'booking-888',
        status: 'CONFIRMED'
      }
    });

    const verifyPayload = {
      razorpay_order_id: 'order_DBJOWzybf0sJbb',
      razorpay_payment_id: 'pay_29QQoUBi66xm2f',
      razorpay_signature: 'valid_hmac_sha256_signature'
    };

    const res = await paymentsApi.verifyPayment(verifyPayload);
    expect(res.data.status).toBe('CONFIRMED');
    expect(paymentsApi.verifyPayment).toHaveBeenCalledWith(verifyPayload);
  });
});

