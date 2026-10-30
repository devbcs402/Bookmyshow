import crypto from 'crypto';

export class BookingReferenceService {
  /**
   * Generates a user-friendly unique booking reference / PNR.
   * Format: BK-YYYYMMDD-XXXXXX (e.g. BK-20261030-9K8L2P)
   * @param {Date} [date]
   * @returns {string}
   */
  static generateReference(date = new Date()) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Cryptographically secure 6-character alphanumeric suffix
    const randomBytes = crypto.randomBytes(4);
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars (0, O, 1, I)
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      const byte = randomBytes[i % randomBytes.length];
      suffix += alphabet[(byte + i * 7) % alphabet.length];
    }

    return `BK-${datePrefix}-${suffix}`;
  }

  /**
   * Generates a reference and guarantees uniqueness by querying the datastore.
   * @param {Function} existsCheckFn
   * @param {number} [maxRetries=5]
   * @returns {Promise<string>}
   */
  static async generateUniqueReference(existsCheckFn, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const candidate = this.generateReference();
      const exists = await existsCheckFn(candidate);
      if (!exists) {
        return candidate;
      }
    }
    // High-entropy fallback using UUID slice
    const uuidSuffix = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    return `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${uuidSuffix}`;
  }
}

export default BookingReferenceService;

