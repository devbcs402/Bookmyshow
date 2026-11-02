import { jest } from '@jest/globals';
import GenreService from '../../src/modules/movies/genre.service.js';
import GenreRepository from '../../src/modules/movies/genre.repository.js';
import LanguageService from '../../src/modules/movies/language.service.js';
import LanguageRepository from '../../src/modules/movies/language.repository.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { ConflictError } from '../../src/common/errors/conflict.error.js';
import { NotFoundError } from '../../src/common/errors/not-found.error.js';

describe('Genre and Language Services Unit Tests', () => {
  beforeEach(() => {
    jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GenreService', () => {
    const mockGenre = {
      _id: '65f1a2b3c4d5e6f7a8b9c0d1',
      name: 'Sci-Fi',
      slug: 'sci-fi',
      description: 'Science Fiction',
      isActive: true
    };

    it('should successfully create a new genre', async () => {
      jest.spyOn(GenreRepository, 'findByName').mockResolvedValue(null);
      jest.spyOn(GenreRepository, 'findBySlug').mockResolvedValue(null);
      jest.spyOn(GenreRepository, 'create').mockResolvedValue(mockGenre);

      const genre = await GenreService.createGenre({
        name: 'Sci-Fi',
        description: 'Science Fiction'
      });

      expect(genre).toBeDefined();
      expect(genre.name).toBe('Sci-Fi');
      expect(genre.slug).toBe('sci-fi');
    });

    it('should throw ConflictError on duplicate genre name', async () => {
      jest.spyOn(GenreRepository, 'findByName').mockResolvedValue(mockGenre);

      await expect(GenreService.createGenre({ name: 'Sci-Fi' })).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError on duplicate genre slug', async () => {
      jest.spyOn(GenreRepository, 'findByName').mockResolvedValue(null);
      jest.spyOn(GenreRepository, 'findBySlug').mockResolvedValue(mockGenre);

      await expect(
        GenreService.createGenre({ name: 'Science Fiction', slug: 'sci-fi' })
      ).rejects.toThrow(ConflictError);
    });

    it('should prevent deleting a genre that is referenced in movies', async () => {
      jest.spyOn(GenreRepository, 'findById').mockResolvedValue(mockGenre);
      jest.spyOn(GenreRepository, 'isReferencedInMovies').mockResolvedValue(true);

      await expect(GenreService.deleteGenre(mockGenre._id)).rejects.toThrow(ConflictError);
    });

    it('should soft delete genre when unreferenced', async () => {
      jest.spyOn(GenreRepository, 'findById').mockResolvedValue(mockGenre);
      jest.spyOn(GenreRepository, 'isReferencedInMovies').mockResolvedValue(false);
      jest.spyOn(GenreRepository, 'softDelete').mockResolvedValue({});

      const res = await GenreService.deleteGenre(mockGenre._id);
      expect(res.message).toContain('deleted successfully');
    });
  });

  describe('LanguageService', () => {
    const mockLanguage = {
      _id: '65f1a2b3c4d5e6f7a8b9c0d2',
      name: 'Hindi',
      code: 'hi',
      nativeName: 'हिन्दी',
      isActive: true
    };

    it('should successfully create a new language', async () => {
      jest.spyOn(LanguageRepository, 'findByName').mockResolvedValue(null);
      jest.spyOn(LanguageRepository, 'findByCode').mockResolvedValue(null);
      jest.spyOn(LanguageRepository, 'create').mockResolvedValue(mockLanguage);

      const lang = await LanguageService.createLanguage({
        name: 'Hindi',
        code: 'hi',
        nativeName: 'हिन्दी'
      });

      expect(lang).toBeDefined();
      expect(lang.code).toBe('hi');
    });

    it('should throw ConflictError on duplicate language code', async () => {
      jest.spyOn(LanguageRepository, 'findByName').mockResolvedValue(null);
      jest.spyOn(LanguageRepository, 'findByCode').mockResolvedValue(mockLanguage);

      await expect(
        LanguageService.createLanguage({ name: 'Hindi Modern', code: 'hi' })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError when updating non-existent language', async () => {
      jest.spyOn(LanguageRepository, 'findById').mockResolvedValue(null);

      await expect(
        LanguageService.updateLanguage('non_existent_id', { name: 'New' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should prevent deleting a language referenced in movies', async () => {
      jest.spyOn(LanguageRepository, 'findById').mockResolvedValue(mockLanguage);
      jest.spyOn(LanguageRepository, 'isReferencedInMovies').mockResolvedValue(true);

      await expect(LanguageService.deleteLanguage(mockLanguage._id)).rejects.toThrow(ConflictError);
    });
  });
});
