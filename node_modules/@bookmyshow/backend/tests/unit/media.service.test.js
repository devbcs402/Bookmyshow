import MediaService from '../../src/services/media/media.service.js';
import { MediaCategory } from '../../src/modules/movies/movie.constants.js';
import { ValidationError } from '../../src/common/errors/validation.error.js';

describe('MediaService Unit Tests', () => {
  describe('validateImage', () => {
    it('should validate legitimate image metadata', () => {
      const isValid = MediaService.validateImage({
        mimeType: 'image/jpeg',
        sizeBytes: 2 * 1024 * 1024,
        category: MediaCategory.POSTER
      });
      expect(isValid).toBe(true);
    });

    it('should reject invalid MIME types', () => {
      expect(() =>
        MediaService.validateImage({
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          category: MediaCategory.POSTER
        })
      ).toThrow(ValidationError);
    });

    it('should reject images exceeding 5MB limit', () => {
      expect(() =>
        MediaService.validateImage({
          mimeType: 'image/png',
          sizeBytes: 6 * 1024 * 1024,
          category: MediaCategory.BANNER
        })
      ).toThrow(ValidationError);
    });

    it('should reject invalid category', () => {
      expect(() =>
        MediaService.validateImage({
          mimeType: 'image/webp',
          sizeBytes: 1024,
          category: 'invalid_category'
        })
      ).toThrow(ValidationError);
    });
  });

  describe('validateTrailerUrl', () => {
    it('should accept valid YouTube video URLs', () => {
      expect(MediaService.validateTrailerUrl('https://www.youtube.com/watch?v=zSWdZVtXT7E')).toBe(
        true
      );
      expect(MediaService.validateTrailerUrl('https://youtu.be/zSWdZVtXT7E')).toBe(true);
    });

    it('should accept valid Vimeo video URLs', () => {
      expect(MediaService.validateTrailerUrl('https://vimeo.com/123456789')).toBe(true);
    });

    it('should reject non-video or arbitrary URLs', () => {
      expect(MediaService.validateTrailerUrl('https://malicious-site.com/exploit.mp4')).toBe(false);
      expect(MediaService.validateTrailerUrl('')).toBe(false);
      expect(MediaService.validateTrailerUrl(null)).toBe(false);
    });
  });

  describe('deleteMedia', () => {
    it('should execute media purge hook in mock/test mode', async () => {
      const res = await MediaService.deleteMedia('https://res.cloudinary.com/bms/image/sample.jpg');
      expect(res.success).toBe(true);
    });
  });
});
