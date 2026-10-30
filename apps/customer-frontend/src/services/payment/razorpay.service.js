/**
 * Dynamically loads the official Razorpay Checkout SDK script
 * @returns {Promise<boolean>}
 */
export function loadRazorpayScript() {
  return new Promise(resolve => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('[Razorpay] Failed to load Checkout SDK script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Launches the Razorpay checkout standard modal using server-provided order details
 * @param {Object} options
 * @param {string} options.keyId Public key ID from backend
 * @param {string} options.orderId Razorpay order ID (e.g. order_xxx)
 * @param {number} options.amount Amount in paise
 * @param {string} options.currency Currency code (e.g. INR)
 * @param {string} options.bookingReference Booking reference code
 * @param {Object} options.prefill Prefill customer name, email, phone
 * @returns {Promise<Object>} Verification response payload
 */
export async function openRazorpayCheckout({
  keyId,
  orderId,
  amount,
  currency = 'INR',
  bookingReference,
  prefill = {}
}) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error('Unable to load payment gateway. Please check your internet connection.');
  }

  return new Promise((resolve, reject) => {
    const options = {
      key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: amount,
      currency: currency,
      name: 'BookMyShow',
      description: `Movie Tickets Booking #${bookingReference}`,
      image: '/favicon.svg',
      order_id: orderId,
      prefill: {
        name: prefill.name || '',
        email: prefill.email || '',
        contact: prefill.phone || ''
      },
      theme: {
        color: '#E50914'
      },
      modal: {
        ondismiss: () => {
          reject({
            status: 'CANCELLED_BY_USER',
            message: 'Payment cancelled by customer'
          });
        }
      },
      handler: response => {
        // Response contains razorpay_payment_id, razorpay_order_id, razorpay_signature
        resolve({
          razorpay_order_id: response.razorpay_order_id || orderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        });
      }
    };

    const rzp = new window.Razorpay(options);

    rzp.on('payment.failed', response => {
      reject({
        status: 'PAYMENT_FAILED',
        message: response.error?.description || 'Payment was declined by your bank',
        error: response.error
      });
    });

    rzp.open();
  });
}

export default {
  loadRazorpayScript,
  openRazorpayCheckout
};

