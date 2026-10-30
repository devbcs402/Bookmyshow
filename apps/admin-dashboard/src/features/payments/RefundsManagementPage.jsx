import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  CreditCard, 
  Search, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { adminPaymentsApi } from '../../services/api/admin-payments.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function RefundsManagementPage() {
  const [lookupPaymentId, setLookupPaymentId] = useState('');
  const [paymentData, setPaymentData] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [actionError, setActionError] = useState(null);
  const [refundSuccessData, setRefundSuccessData] = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupPaymentId.trim()) return;

    setIsLookingUp(true);
    setLookupError(null);
    setPaymentData(null);
    setRefundSuccessData(null);

    try {
      const data = await adminPaymentsApi.getPaymentById(lookupPaymentId.trim());
      setPaymentData(data);
      setRefundAmount(data.amount ? String(data.amount) : '');
    } catch (err) {
      setLookupError(err.response?.data?.message || err.message || 'Payment not found with this transaction ID');
    } finally {
      setIsLookingUp(false);
    }
  };

  const refundMutation = useMutation({
    mutationFn: ({ paymentId, amount, reason }) =>
      adminPaymentsApi.initiateRefund(paymentId, { amount: Number(amount), reason }),
    onSuccess: (data) => {
      setRefundSuccessData(data);
      setRefundModalOpen(false);
      setPaymentData(null);
      setLookupPaymentId('');
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || err.message || 'Refund initiation failed');
    }
  });

  const handleOpenRefundModal = () => {
    setActionError(null);
    setRefundModalOpen(true);
  };

  const handleConfirmRefund = () => {
    const amt = Number(refundAmount);
    if (!amt || amt <= 0) {
      setActionError('Refund amount must be a positive number.');
      return;
    }
    if (paymentData?.amount && amt > paymentData.amount) {
      setActionError(`Refund amount cannot exceed captured transaction amount of ${formatCurrency(paymentData.amount)}.`);
      return;
    }
    if (!refundReason.trim()) {
      setActionError('Mandatory refund justification reason required.');
      return;
    }

    refundMutation.mutate({
      paymentId: paymentData._id || paymentData.id || lookupPaymentId.trim(),
      amount: amt,
      reason: refundReason.trim(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Payment Refunds & Gateway Settlements
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Issue full or partial refunds directly through the Razorpay payment infrastructure.
        </p>
      </div>

      {/* Safety Notice Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start space-x-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Strict Razorpay Refund Rules:</span>
          <p className="mt-0.5 leading-relaxed">
            All refunds are immediately pushed to Razorpay. The system strictly validates maximum refundable limits
            to prevent over-refunding or duplicate claims. All refund actions are immutably logged with administrator identity.
          </p>
        </div>
      </div>

      {/* Refund Success Alert */}
      {refundSuccessData && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 flex items-start space-x-3 animate-fadeIn">
          <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold">Refund Successfully Dispatched</h3>
            <p className="text-xs text-emerald-800">
              Razorpay refund request processed. Reference ID:{' '}
              <span className="font-mono font-bold">{refundSuccessData.refundId || refundSuccessData.id || 'GATEWAY_SUCCESS'}</span>
            </p>
            <p className="text-[11px] text-emerald-700">
              Funds will be returned to the customer's original payment method according to banking schedules (typically 3–5 business days).
            </p>
          </div>
        </div>
      )}

      {/* Lookup Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Step 1: Locate Payment Transaction</h3>
        <p className="text-xs text-slate-500 mb-4">
          Enter the platform Payment ID or Razorpay Payment ID to verify eligibility.
        </p>

        <form onSubmit={handleLookup} className="flex gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={lookupPaymentId}
              onChange={(e) => setLookupPaymentId(e.target.value)}
              placeholder="e.g. 660f1b2c3d4e5f6a7b8c9d0e or pay_..."
              className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
            />
          </div>
          <Button type="submit" variant="primary" disabled={isLookingUp}>
            {isLookingUp ? 'Searching...' : 'Inspect Payment'}
          </Button>
        </form>

        {lookupError && (
          <div className="mt-4 flex items-center space-x-2 text-xs text-rose-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}
      </div>

      {/* Payment Inspection Card */}
      {paymentData && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Step 2: Verified Transaction Details</h3>
              <p className="text-xs text-slate-500 font-mono">Payment ID: {paymentData._id || paymentData.id}</p>
            </div>
            <StatusBadge status={paymentData.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-500 block mb-1">Captured Amount</span>
              <span className="text-base font-bold text-slate-900">{formatCurrency(paymentData.amount || 0)}</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-500 block mb-1">Gateway Reference</span>
              <span className="font-mono font-semibold text-slate-800 truncate block">
                {paymentData.gatewayPaymentId || paymentData.razorpayPaymentId || 'N/A'}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-500 block mb-1">Booking Ref</span>
              <span className="font-mono font-semibold text-slate-800">
                {paymentData.bookingReference || paymentData.booking?.bookingReference || 'Linked'}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-500 block mb-1">Processed On</span>
              <span className="font-semibold text-slate-800">{formatDate(paymentData.createdAt)}</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="danger"
              onClick={handleOpenRefundModal}
              disabled={paymentData.status === 'REFUNDED'}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              {paymentData.status === 'REFUNDED' ? 'Already Fully Refunded' : 'Initiate Refund Request'}
            </Button>
          </div>
        </div>
      )}

      {/* Refund Trigger Modal */}
      <Modal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title="Confirm Administrative Refund"
        size="md"
      >
        <div className="space-y-4">
          {actionError && (
            <div className="flex items-center space-x-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Specify the refund value to be returned to the customer's funding instrument via Razorpay.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Refund Amount (INR) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Max refundable amount: {formatCurrency(paymentData?.amount || 0)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Refund Reason / Compliance Audit Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Customer requested cancellation before show cutoff, or emergency screening disruption."
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRefundModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmRefund}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending ? 'Submitting to Gateway...' : 'Execute Razorpay Refund'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
