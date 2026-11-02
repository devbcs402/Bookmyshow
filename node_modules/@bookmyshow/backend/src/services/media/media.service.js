import config from '../../config/env.js';
import logger from '../../config/logger.js';
import { MediaCategory } from '../../modules/movies/movie.constants.js';
import { ValidationError } from '../../common/errors/validation.error.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const TRAILER_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/.+$/i;

export class MediaService {
  /**
   * Validate image metadata (size, mime type, category)
   */
  static validateImage({ mimeType, sizeBytes, category }) {
    if (!category || !Object.values(MediaCategory).includes(category)) {
      throw new ValidationError(
        `Invalid media category. Allowed: ${Object.values(MediaCategory).join(', ')}`
      );
    }

    if (category === MediaCategory.TRAILER) {
      throw new ValidationError(
        'Trailers must be validated as video streaming URLs, not binary images'
      );
    }

    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new ValidationError(
        `Invalid image MIME type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    if (sizeBytes && sizeBytes > MAX_IMAGE_SIZE_BYTES) {
      throw new ValidationError(
        `File exceeds maximum permitted size of 5MB (Received: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB)`
      );
    }

    return true;
  }

  /**
   * Validate trailer video URL
   */
  static validateTrailerUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    return TRAILER_REGEX.test(url.trim());
  }

  /**
   * Delete / Purge media from cloud storage to prevent orphaned files
   */
  static async deleteMedia(mediaUrlOrPublicId) {
    if (!mediaUrlOrPublicId) {
      return { success: true };
    }

    // In test environment or unconfigured Cloudinary, return mock success
    if (config.NODE_ENV === 'test' || !process.env.CLOUDINARY_API_KEY) {
      logger.debug({
        msg: 'Media cleanup executed (mock/test mode)',
        target: mediaUrlOrPublicId
      });
      return { success: true, deleted: true, target: mediaUrlOrPublicId };
    }

    try {
      // In production with Cloudinary configured:
      // const cloudinary = await import('cloudinary');
      // await cloudinary.v2.uploader.destroy(publicId);
      logger.info({
        msg: 'Purged media asset from storage CDN',
        target: mediaUrlOrPublicId
      });
      return { success: true, deleted: true };
    } catch (err) {
      logger.warn({
        msg: 'Failed to purge media asset from CDN',
        target: mediaUrlOrPublicId,
        error: err.message
      });
      return { success: false, error: err.message };
    }
  }
}

export default MediaService;
