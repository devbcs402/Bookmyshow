import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import paymentsApi from '../../services/api/payments.api';
import bookingsApi from '../../services/api/bookings.api';
import { openRazorpayCheckout } from '../../services/payment/razorpay.service';
import { useAuthStore } from '../../store/auth.store';
import { useSeatLockStore } from '../../store/seatLock.store';
import CountdownTimer from '../../components/common/CountdownTimer';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { formatCurrency } from '../../utils/formatters';

const PAYMENT_STATES = {
  IDLE: 'IDLE',
  CREATING_ORDER: 'CREATING_ORDER',
  CHECKOUT_OPEN: 'CHECKOUT_OPEN',
  VERIFYING: 'VERIFYING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

export function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { remainingSeconds, isExpired } = useSeatLockStore();

  const [paymentState, setPaymentState] = useState(PAYMENT_STATES.IDLE);
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch Booking Details
  const { data: bookingData, isLoading } = useQuery({
    queryKey: ['booking-payment', bookingId],
    queryFn: () => bookingsApi.getBookingById(bookingId),
    initialData: location.state?.booking ? { data: location.state.booking } : undefined
  });

  const booking = bookingData?.data;

  // Launch Payment Gateway
  const handleLaunchPayment = async () => {
    if (isExpired || remainingSeconds <= 0) {
      setErrorMessage('Your seat lock expired before payment could be initiated.');
      setPaymentState(PAYMENT_STATES.FAILED);
      return;
    }

    setErrorMessage(null);
    setPaymentState(PAYMENT_STATES.CREATING_ORDER);

    try {
      // 1. Request Razorpay Order from backend
      const idempotencyKey = `pay-${bookingId}-${Date.now()}`;
      const orderRes = await paymentsApi.createPaymentOrder(bookingId, idempotencyKey);
      const checkoutData = orderRes.data;

      setPaymentState(PAYMENT_STATES.CHECKOUT_OPEN);

      // 2. Open standard Razorpay Checkout modal
      const paymentResponse = await openRazorpayCheckout({
        keyId: checkoutData.keyId,
        orderId: checkoutData.orderId,
        amount: checkoutData.amount,
        currency: checkoutData.currency || 'INR',
        bookingReference: checkoutData.bookingReference,
        prefill: {
          name: user?.name,
          email: user?.email,
          phone: user?.phone
        }
      });

      // 3. Submit signature for backend verification
      setPaymentState(PAYMENT_STATES.VERIFYING);
      const verificationRes = await paymentsApi.verifyPayment({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature
      });

      // 4. Payment confirmed
      setPaymentState(PAYMENT_STATES.SUCCESS);
      setTimeout(() => {
        navigate(`/booking/${bookingId}/confirmation`, { replace: true });
      }, 1200);
    } catch (err) {
      if (err.status === 'CANCELLED_BY_USER') {
        setPaymentState(PAYMENT_STATES.CANCELLED);
        setErrorMessage('Checkout was cancelled. Your seats remain reserved until the timer expires.');
      } else {
        setPaymentState(PAYMENT_STATES.FAILED);
        setErrorMessage(
          err.message || 'Payment processing failed. Please check your card or retry.'
        );
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading payment gateway...</p>
      </div>
    );
  }

  const totalAmount = booking?.pricing?.totalPayable || booking?.totalAmount || 0;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cinema-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg bg-cinema-card border border-cinema-border text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand" />
              <span>Checkout & Payment</span>
            </h1>
            <p className="text-xs text-slate-400">
              Reference: <span className="font-mono text-slate-200">{booking?.bookingReference}</span>
            </p>
          </div>
        </div>

        <CountdownTimer />
      </div>

      {/* State Banners */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {paymentState === PAYMENT_STATES.VERIFYING && (
        <div className="p-6 rounded-2xl bg-cinema-card border border-brand/50 text-center space-y-3 shadow-cinema-glow">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="font-bold text-base text-white">Verifying Cryptographic Signature</h3>
          <p className="text-xs text-slate-400">
            Please wait while the backend securely reconciles your Razorpay payment...
          </p>
        </div>
      )}

      {paymentState === PAYMENT_STATES.SUCCESS && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="font-bold text-lg text-white">Payment Confirmed!</h3>
          <p className="text-xs text-slate-300">
            Your booking is secured. Generating your digital ticket...
          </p>
        </div>
      )}

      {/* Main Payment Card */}
      {paymentState !== PAYMENT_STATES.VERIFYING && paymentState !== PAYMENT_STATES.SUCCESS && (
        <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-cinema-border/60">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">
                Total Amount Due
              </p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-0.5">
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <Badge variant="outline" size="sm" className="bg-slate-800 text-slate-300 font-mono">
              Razorpay Secure
            </Badge>
          </div>

          {/* Payment Method Details */}
          <div className="space-y-3 text-xs text-slate-300">
            <p className="font-semibold text-slate-200">Supported Methods:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-cinema-elevated border border-cinema-border text-[11px] font-medium">
                Credit / Debit
              </div>
              <div className="p-2.5 rounded-lg bg-cinema-elevated border border-cinema-border text-[11px] font-medium">
                UPI / QR
              </div>
              <div className="p-2.5 rounded-lg bg-cinema-elevated border border-cinema-border text-[11px] font-medium">
                Net Banking
              </div>
              <div className="p-2.5 rounded-lg bg-cinema-elevated border border-cinema-border text-[11px] font-medium">
                Wallets
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            variant="primary"
            fullWidth
            size="lg"
            isLoading={paymentState === PAYMENT_STATES.CREATING_ORDER || paymentState === PAYMENT_STATES.CHECKOUT_OPEN}
            disabled={isExpired || remainingSeconds <= 0}
            onClick={handleLaunchPayment}
            leftIcon={CreditCard}
            className="shadow-cinema-glow"
          >
            Pay {formatCurrency(totalAmount)} with Razorpay
          </Button>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PCI-DSS compliant 256-bit SSL encrypted checkout</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentPage;

