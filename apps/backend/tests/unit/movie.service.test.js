import { jest } from '@jest/globals';
import MovieService from '../../src/modules/movies/movie.service.js';
import MovieRepository from '../../src/modules/movies/movie.repository.js';
import GenreRepository from '../../src/modules/movies/genre.repository.js';
import LanguageRepository from '../../src/modules/movies/language.repository.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import {
  MovieStatus,
  CensorRating,
  MovieFormat
} from '../../src/modules/movies/movie.constants.js';
import { ValidationError } from '../../src/common/errors/validation.error.js';
import { NotFoundError } from '../../src/common/errors/not-found.error.js';

describe('MovieService Unit Tests', () => {
  beforeEach(() => {
    jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockGenre = { _id: '65f1a2b3c4d5e6f7a8b9c0d1', name: 'Sci-Fi', slug: 'sci-fi' };
  const mockLanguage = { _id: '65f1a2b3c4d5e6f7a8b9c0d2', name: 'English', code: 'en' };

  const validMoviePayload = {
    title: 'Inception',
    synopsis:
      'A thief who steals corporate secrets through dream-sharing technology is given an inverse task.',
    durationMins: 148,
    releaseDate: '2026-12-01T00:00:00.000Z',
    censorRating: CensorRating.UA,
    genreIds: [mockGenre._id],
    languageIds: [mockLanguage._id],
    availableFormats: [MovieFormat.TWO_D, MovieFormat.IMAX_2D],
    posterUrl: 'https://res.cloudinary.com/bms/inception-poster.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=YoHD9XEInc0'
  };

  describe('createMovie', () => {
    it('should create movie with unique slug and DRAFT status', async () => {
      jest.spyOn(GenreRepository, 'findByIds').mockResolvedValue([mockGenre]);
      jest.spyOn(LanguageRepository, 'findByIds').mockResolvedValue([mockLanguage]);
      jest.spyOn(MovieRepository, 'existsBySlug').mockResolvedValue(false);

      const createdDoc = {
        _id: '65f1a2b3c4d5e6f7a8b9c0aa',
        ...validMoviePayload,
        slug: 'inception',
        genreSlugs: ['sci-fi'],
        status: MovieStatus.DRAFT
      };

      jest.spyOn(MovieRepository, 'create').mockResolvedValue(createdDoc);
      jest.spyOn(MovieRepository, 'findById').mockResolvedValue(createdDoc);

      const result = await MovieService.createMovie(validMoviePayload, 'admin_id', 'SUPER_ADMIN');

      expect(result).toBeDefined();
      expect(result.slug).toBe('inception');
      expect(result.status).toBe(MovieStatus.DRAFT);
      expect(MovieRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should reject when genreIds do not exist', async () => {
      jest.spyOn(GenreRepository, 'findByIds').mockResolvedValue([]); // No matching genres found

      await expect(MovieService.createMovie(validMoviePayload)).rejects.toThrow(ValidationError);
    });

    it('should reject when languageIds do not exist', async () => {
      jest.spyOn(GenreRepository, 'findByIds').mockResolvedValue([mockGenre]);
      jest.spyOn(LanguageRepository, 'findByIds').mockResolvedValue([]);

      await expect(MovieService.createMovie(validMoviePayload)).rejects.toThrow(ValidationError);
    });

    it('should reject invalid video trailer URLs', async () => {
      jest.spyOn(GenreRepository, 'findByIds').mockResolvedValue([mockGenre]);
      jest.spyOn(LanguageRepository, 'findByIds').mockResolvedValue([mockLanguage]);

      const invalidPayload = {
        ...validMoviePayload,
        trailerUrl: 'https://not-youtube-or-vimeo.com/video.mp4'
      };

      await expect(MovieService.createMovie(invalidPayload)).rejects.toThrow(ValidationError);
    });
  });

  describe('updateMovie', () => {
    const existingMovie = {
      _id: '65f1a2b3c4d5e6f7a8b9c0aa',
      title: 'Inception',
      slug: 'inception',
      status: MovieStatus.DRAFT,
      releaseDate: new Date('2026-12-01')
    };

    it('should update movie fields safely', async () => {
      jest.spyOn(MovieRepository, 'findById').mockResolvedValue(existingMovie);
      jest.spyOn(MovieRepository, 'update').mockResolvedValue({
        ...existingMovie,
        title: 'Inception Remastered'
      });

      const updated = await MovieService.updateMovie(
        existingMovie._id,
        { title: 'Inception Remastered' },
        'admin_id'
      );

      expect(updated.title).toBe('Inception Remastered');
    });

    it('should reject invalid status transitions for non-super-admins', async () => {
      const activeMovie = {
        ...existingMovie,
        status: MovieStatus.NOW_SHOWING
      };

      jest.spyOn(MovieRepository, 'findById').mockResolvedValue(activeMovie);

      // Attempting NOW_SHOWING -> DRAFT is invalid
      await expect(
        MovieService.updateMovie(
          activeMovie._id,
          { status: MovieStatus.DRAFT },
          'editor_id',
          'EDITOR'
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteMovie', () => {
    it('should soft-delete movie', async () => {
      jest.spyOn(MovieRepository, 'findById').mockResolvedValue({
        _id: 'movie_1',
        title: 'Test Movie',
        slug: 'test-movie'
      });
      jest.spyOn(MovieRepository, 'softDelete').mockResolvedValue({});

      const res = await MovieService.deleteMovie('movie_1', 'admin_id');
      expect(res.message).toContain('archived');
      expect(MovieRepository.softDelete).toHaveBeenCalledWith('movie_1', 'admin_id');
    });
  });

  describe('approveMovie and rejectMovie', () => {
    const movie = {
      _id: 'movie_1',
      title: 'Interstellar',
      status: MovieStatus.PENDING_APPROVAL,
      releaseDate: new Date('2026-12-25') // Future date
    };

    it('should approve movie and derive UPCOMING status for future release', async () => {
      jest.spyOn(MovieRepository, 'findById').mockResolvedValue(movie);
      jest.spyOn(MovieRepository, 'update').mockResolvedValue({
        ...movie,
        status: MovieStatus.UPCOMING,
        approvedBy: 'admin_id'
      });

      const approved = await MovieService.approveMovie('movie_1', 'admin_id');
      expect(approved.status).toBe(MovieStatus.UPCOMING);
      expect(MovieRepository.update).toHaveBeenCalledWith(
        'movie_1',
        expect.objectContaining({ status: MovieStatus.UPCOMING, approvedBy: 'admin_id' })
      );
    });

    it('should reject movie with reason', async () => {
      jest.spyOn(MovieRepository, 'findById').mockResolvedValue(movie);
      jest.spyOn(MovieRepository, 'update').mockResolvedValue({
        ...movie,
        status: MovieStatus.REJECTED,
        rejectionReason: 'Censor certificate missing'
      });

      const rejected = await MovieService.rejectMovie(
        'movie_1',
        'Censor certificate missing',
        'admin_id'
      );
      expect(rejected.status).toBe(MovieStatus.REJECTED);
      expect(rejected.rejectionReason).toBe('Censor certificate missing');
    });
  });

  describe('getMovieBySlug', () => {
    it('should return movie details for publicly available movie', async () => {
      const publicMovie = {
        _id: 'movie_1',
        title: 'Interstellar',
        slug: 'interstellar',
        synopsis: 'Explorers travel through a wormhole...',
        durationMins: 169,
        releaseDate: new Date('2026-11-05'),
        censorRating: 'UA',
        status: MovieStatus.NOW_SHOWING,
        avgRating: 9.2,
        totalReviews: 1200
      };

      jest.spyOn(MovieRepository, 'findBySlug').mockResolvedValue(publicMovie);

      const details = await MovieService.getMovieBySlug('interstellar');
      expect(details).toBeDefined();
      expect(details.slug).toBe('interstellar');
      expect(details.title).toBe('Interstellar');
    });

    it('should throw NotFoundError if movie is not found or not publicly visible', async () => {
      jest.spyOn(MovieRepository, 'findBySlug').mockResolvedValue(null);

      await expect(MovieService.getMovieBySlug('draft-hidden-movie')).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
