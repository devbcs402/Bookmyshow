import { SupportedLanguages } from '../constants/notification.constants.js';

export class TemplateEngine {
  /**
   * Escapes special HTML characters to prevent HTML/script injection attacks.
   *
   * @param {string|any} str
   * @returns {string} Sanitized string
   */
  static escapeHtml(str) {
    if (str === null || str === undefined) {
      return '';
    }
    const val = String(str);
    return val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Renders a template string by replacing {{variable}} placeholders with values from data.
   * By default, variables in HTML are escaped unless triple braces {{{raw}}} are used.
   *
   * @param {string} templateString
   * @param {Object} data
   * @param {boolean} [isHtml=false]
   * @returns {string}
   */
  static render(templateString, data = {}, isHtml = false) {
    if (!templateString || typeof templateString !== 'string') {
      return '';
    }

    // Replace unescaped triple braces {{{raw}}} first
    let result = templateString.replace(/\{\{\{([\w.-]+)\}\}\}/g, (_match, key) => {
      const val = data[key.trim()];
      return val !== undefined && val !== null ? String(val) : '';
    });

    // Replace standard double braces {{escaped}}
    result = result.replace(/\{\{([\w.-]+)\}\}/g, (_match, key) => {
      const val = data[key.trim()];
      if (val === undefined || val === null) {
        return '';
      }
      return isHtml ? this.escapeHtml(val) : String(val);
    });

    return result;
  }

  /**
   * Validates that all required variables are supplied in the data payload.
   *
   * @param {Array<string>} requiredVariables
   * @param {Object} data
   * @returns {{ valid: boolean, missing: Array<string> }}
   */
  static validateVariables(requiredVariables = [], data = {}) {
    if (!Array.isArray(requiredVariables) || requiredVariables.length === 0) {
      return { valid: true, missing: [] };
    }

    const missing = requiredVariables.filter(
      varName => data[varName] === undefined || data[varName] === null
    );

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Retrieves a default template definition when no custom database template is registered.
   * Supports 'en', 'hi', and 'gu' with fallback to 'en'.
   *
   * @param {string} templateKey
   * @param {string} channel
   * @param {string} [language='en']
   * @returns {Object|null}
   */
  static getDefaultTemplate(templateKey, channel, language = SupportedLanguages.EN) {
    const lang = Object.values(SupportedLanguages).includes(language)
      ? language
      : SupportedLanguages.EN;
    const key = `${templateKey}:${channel}:${lang}`;

    if (DEFAULT_TEMPLATES[key]) {
      return DEFAULT_TEMPLATES[key];
    }

    // Fallback to English
    const fallbackKey = `${templateKey}:${channel}:${SupportedLanguages.EN}`;
    return DEFAULT_TEMPLATES[fallbackKey] || null;
  }
}

/**
 * Built-in default notification templates covering all required operational channels and languages.
 */
export const DEFAULT_TEMPLATES = {
  // ===========================================================================
  // BOOKING_CONFIRMED
  // ===========================================================================
  'BOOKING_CONFIRMED:EMAIL:en': {
    subject: 'Your movie ticket is confirmed! - {{bookingReference}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #e50914; margin-top: 0;">Ticket Confirmation</h2>
        <p>Dear <strong>{{customerName}}</strong>,</p>
        <p>Your ticket reservation is confirmed! Here are your show details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Movie:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{{movieTitle}}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Theatre:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{{theatreName}} ({{screenName}})</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Showtime:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{{showDate}} at {{showTime}}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Seats:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{{seatLabels}}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Booking Ref:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{{bookingReference}}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total Paid:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">₹{{totalAmount}}</td></tr>
        </table>
        <p><a href="{{ticketUrl}}" style="background-color: #e50914; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Digital QR Ticket</a></p>
        <p style="font-size: 12px; color: #777;">Please arrive at the venue 15 minutes before the showtime. Enjoy the movie!</p>
      </div>
    `,
    plainTextTemplate:
      'Dear {{customerName}}, your ticket for {{movieTitle}} at {{theatreName}} is confirmed. Seats: {{seatLabels}}. Ref: {{bookingReference}}. View ticket: {{ticketUrl}}',
    variables: [
      'customerName',
      'bookingReference',
      'movieTitle',
      'theatreName',
      'screenName',
      'showDate',
      'showTime',
      'seatLabels',
      'totalAmount',
      'ticketUrl'
    ]
  },
  'BOOKING_CONFIRMED:SMS:en': {
    bodyTemplate:
      'BookMyShow: Ticket confirmed for {{movieTitle}} at {{theatreName}} on {{showDate}} {{showTime}}. Seats: {{seatLabels}}. Ref: {{bookingReference}}. Details: {{ticketUrl}}',
    variables: [
      'movieTitle',
      'theatreName',
      'showDate',
      'showTime',
      'seatLabels',
      'bookingReference',
      'ticketUrl'
    ]
  },
  'BOOKING_CONFIRMED:WHATSAPP:en': {
    whatsappTemplateName: 'bms_booking_confirmed',
    bodyTemplate:
      'Hi {{customerName}}, your booking {{bookingReference}} for {{movieTitle}} is confirmed! Seats: {{seatLabels}} at {{theatreName}} ({{showDate}} {{showTime}}). View ticket: {{ticketUrl}}',
    variables: [
      'customerName',
      'bookingReference',
      'movieTitle',
      'seatLabels',
      'theatreName',
      'showDate',
      'showTime',
      'ticketUrl'
    ]
  },
  'BOOKING_CONFIRMED:IN_APP:en': {
    subject: 'Booking Confirmed! 🎟️',
    bodyTemplate:
      'Your booking {{bookingReference}} for {{movieTitle}} is confirmed! Seats: {{seatLabels}} at {{theatreName}}.',
    variables: ['bookingReference', 'movieTitle', 'seatLabels', 'theatreName']
  },

  // Hindi Localization
  'BOOKING_CONFIRMED:EMAIL:hi': {
    subject: 'आपका मूवी टिकट कन्फर्म हो गया है! - {{bookingReference}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #e50914;">टिकट पुष्टिकरण</h2>
        <p>नमस्ते <strong>{{customerName}}</strong>,</p>
        <p>आपकी टिकट सफलतापूर्वक बुक हो गई है। शो विवरण:</p>
        <p><strong>फिल्म:</strong> {{movieTitle}}<br><strong>सिनेमा:</strong> {{theatreName}}<br><strong>समय:</strong> {{showDate}} {{showTime}}<br><strong>सीटें:</strong> {{seatLabels}}<br><strong>बुकिंग संदर्भ:</strong> {{bookingReference}}</p>
        <p><a href="{{ticketUrl}}" style="background-color: #e50914; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">डिजिटल टिकट देखें</a></p>
      </div>
    `,
    variables: [
      'customerName',
      'bookingReference',
      'movieTitle',
      'theatreName',
      'showDate',
      'showTime',
      'seatLabels',
      'ticketUrl'
    ]
  },
  'BOOKING_CONFIRMED:SMS:hi': {
    bodyTemplate:
      'BookMyShow: {{movieTitle}} के लिए टिकट कन्फर्म है। सिनेमा: {{theatreName}}, समय: {{showDate}} {{showTime}}, सीटें: {{seatLabels}}, संदर्भ: {{bookingReference}}। {{ticketUrl}}',
    variables: [
      'movieTitle',
      'theatreName',
      'showDate',
      'showTime',
      'seatLabels',
      'bookingReference',
      'ticketUrl'
    ]
  },

  // Gujarati Localization
  'BOOKING_CONFIRMED:EMAIL:gu': {
    subject: 'તમારી મૂવી ટિકિટ કન્ફર્મ થઈ ગઈ છે! - {{bookingReference}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #e50914;">ટિકિટ કન્ફર્મેશન</h2>
        <p>નમસ્તે <strong>{{customerName}}</strong>,</p>
        <p>તમારી ટિકિટ સફળતાપૂર્વક બુક થઈ ગઈ છે. શો વિગતો:</p>
        <p><strong>મૂવી:</strong> {{movieTitle}}<br><strong>થિયેટર:</strong> {{theatreName}}<br><strong>સમય:</strong> {{showDate}} {{showTime}}<br><strong>સીટો:</strong> {{seatLabels}}<br><strong>બુકિંગ સંદર્ભ:</strong> {{bookingReference}}</p>
        <p><a href="{{ticketUrl}}" style="background-color: #e50914; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">ડિજિટલ ટિકિટ જુઓ</a></p>
      </div>
    `,
    variables: [
      'customerName',
      'bookingReference',
      'movieTitle',
      'theatreName',
      'showDate',
      'showTime',
      'seatLabels',
      'ticketUrl'
    ]
  },

  // ===========================================================================
  // PAYMENT_SUCCESS
  // ===========================================================================
  'PAYMENT_SUCCESS:EMAIL:en': {
    subject: 'Payment Successful - ₹{{amount}} received for booking {{bookingReference}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2e7d32;">Payment Received</h2>
        <p>Dear <strong>{{customerName}}</strong>,</p>
        <p>We have successfully processed your payment of <strong>₹{{amount}}</strong> via {{paymentMethod}}.</p>
        <p><strong>Transaction ID:</strong> {{paymentId}}<br><strong>Booking Reference:</strong> {{bookingReference}}</p>
      </div>
    `,
    variables: ['customerName', 'amount', 'paymentMethod', 'paymentId', 'bookingReference']
  },
  'PAYMENT_SUCCESS:SMS:en': {
    bodyTemplate:
      'BookMyShow: Payment of ₹{{amount}} for booking {{bookingReference}} was successful. Txn ID: {{paymentId}}.',
    variables: ['amount', 'bookingReference', 'paymentId']
  },
  'PAYMENT_SUCCESS:IN_APP:en': {
    subject: 'Payment Successful ✅',
    bodyTemplate: 'Payment of ₹{{amount}} received for booking {{bookingReference}}.',
    variables: ['amount', 'bookingReference']
  },

  // ===========================================================================
  // REFUND_PROCESSED
  // ===========================================================================
  'REFUND_PROCESSED:EMAIL:en': {
    subject: 'Refund Processed - ₹{{refundAmount}} for booking {{bookingReference}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0288d1;">Refund Processed</h2>
        <p>Dear <strong>{{customerName}}</strong>,</p>
        <p>A refund of <strong>₹{{refundAmount}}</strong> has been issued for booking <strong>{{bookingReference}}</strong>.</p>
        <p><strong>Reason:</strong> {{reason}}<br><strong>Refund ID:</strong> {{refundId}}</p>
        <p style="font-size: 12px; color: #777;">Funds typically reflect in your source account within 5-7 business days depending on your bank.</p>
      </div>
    `,
    variables: ['customerName', 'refundAmount', 'bookingReference', 'reason', 'refundId']
  },
  'REFUND_PROCESSED:SMS:en': {
    bodyTemplate:
      'BookMyShow: Refund of ₹{{refundAmount}} for booking {{bookingReference}} has been processed. Refund ID: {{refundId}}.',
    variables: ['refundAmount', 'bookingReference', 'refundId']
  },
  'REFUND_PROCESSED:IN_APP:en': {
    subject: 'Refund Processed 💰',
    bodyTemplate: 'A refund of ₹{{refundAmount}} for booking {{bookingReference}} has been issued.',
    variables: ['refundAmount', 'bookingReference']
  },

  // ===========================================================================
  // AUTH_WELCOME
  // ===========================================================================
  'AUTH_WELCOME:EMAIL:en': {
    subject: 'Welcome to BookMyShow, {{name}}! 🎬',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #e50914;">Welcome to BookMyShow!</h2>
        <p>Hello <strong>{{name}}</strong>,</p>
        <p>Thank you for joining India's leading entertainment ticketing destination. Discover the latest releases, pick your favourite seats with live layout tracking, and enjoy exclusive member offers.</p>
      </div>
    `,
    variables: ['name']
  },
  'AUTH_WELCOME:IN_APP:en': {
    subject: 'Welcome to BookMyShow! 🍿',
    bodyTemplate:
      'Welcome aboard {{name}}! Start exploring movies and booking your favourite seats.',
    variables: ['name']
  },

  // ===========================================================================
  // AUTH_OTP
  // ===========================================================================
  'AUTH_OTP:SMS:en': {
    bodyTemplate:
      'Your BookMyShow verification code for {{purpose}} is {{otp}}. Valid for 10 minutes. Do not share this OTP with anyone.',
    variables: ['purpose', 'otp']
  },
  'AUTH_OTP:EMAIL:en': {
    subject: 'Your Verification Code for {{purpose}}',
    bodyTemplate:
      '<p>Your verification code for <strong>{{purpose}}</strong> is <strong style="font-size: 20px; color: #e50914;">{{otp}}</strong>.</p><p>This code expires in 10 minutes. Never share this code with anyone.</p>',
    variables: ['purpose', 'otp']
  },

  // ===========================================================================
  // AUTH_PASSWORD_RESET
  // ===========================================================================
  'AUTH_PASSWORD_RESET:EMAIL:en': {
    subject: 'Reset your BookMyShow Password',
    bodyTemplate:
      '<p>You requested a password reset. Please click the link below to set a new password:</p><p><a href="{{resetUrl}}" style="background-color: #e50914; color: #fff; padding: 8px 16px; text-decoration: none; border-radius: 4px;">Reset Password</a></p><p>This link expires in 15 minutes.</p>',
    variables: ['resetUrl']
  },

  // ===========================================================================
  // SHOW_CANCELLED
  // ===========================================================================
  'SHOW_CANCELLED:EMAIL:en': {
    subject: 'Important: Show Cancelled - {{movieTitle}} at {{theatreName}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #c62828;">Show Cancellation Notice</h2>
        <p>Dear <strong>{{customerName}}</strong>,</p>
        <p>We regret to inform you that the show for <strong>{{movieTitle}}</strong> scheduled on {{showDate}} at {{showTime}} at {{theatreName}} has been cancelled due to unforeseen operational reasons.</p>
        <p>Your booking <strong>{{bookingReference}}</strong> has been cancelled, and a full automatic refund of <strong>₹{{amount}}</strong> has been initiated.</p>
      </div>
    `,
    variables: [
      'customerName',
      'movieTitle',
      'showDate',
      'showTime',
      'theatreName',
      'bookingReference',
      'amount'
    ]
  },
  'SHOW_CANCELLED:SMS:en': {
    bodyTemplate:
      'BookMyShow: Show cancelled for {{movieTitle}} at {{theatreName}} on {{showDate}}. Booking {{bookingReference}} is refunded (₹{{amount}}). Sorry for the inconvenience.',
    variables: ['movieTitle', 'theatreName', 'showDate', 'bookingReference', 'amount']
  },
  'SHOW_CANCELLED:IN_APP:en': {
    subject: 'Show Cancelled - Full Refund Initiated ⚠️',
    bodyTemplate:
      'Show for {{movieTitle}} on {{showDate}} was cancelled. Full refund of ₹{{amount}} has been initiated for booking {{bookingReference}}.',
    variables: ['movieTitle', 'showDate', 'amount', 'bookingReference']
  },

  // ===========================================================================
  // SYSTEM_ANNOUNCEMENT
  // ===========================================================================
  'SYSTEM_ANNOUNCEMENT:IN_APP:en': {
    subject: '{{title}}',
    bodyTemplate: '{{message}}',
    variables: ['title', 'message']
  },
  'SYSTEM_ANNOUNCEMENT:EMAIL:en': {
    subject: '{{title}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1565c0;">{{title}}</h2>
        <p>{{message}}</p>
      </div>
    `,
    variables: ['title', 'message']
  }
};

export default TemplateEngine;
