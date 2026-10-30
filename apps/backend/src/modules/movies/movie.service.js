import MovieRepository from './movie.repository.js';
import GenreRepository from './genre.repository.js';
import LanguageRepository from './language.repository.js';
import MediaService from '../../services/media/media.service.js';
import {
  generateUniqueSlug,
  isAllowedStatusTransition,
  deriveTheatricalStatus
} from './movie.utils.js';
import { MovieStatus } from './movie.constants.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { ValidationError } from '../../common/errors/validation.error.js';
import ErrorCodes from '../../common/constants/error-codes.js';
import AuthRepository from '../auth/auth.repository.js';

export class MovieService {
  /**
   * Create a new movie record (Admin API)
   */
  static async createMovie(movieData, actorId = null, actorRole = 'SUPER_ADMIN') {
    // 1. Validate Genre References and extract genreSlugs
    const genres = await GenreRepository.findByIds(movieData.genreIds);
    if (genres.length !== movieData.genreIds.length) {
      throw new ValidationError('One or more specified genreIds do not exist or are inactive');
    }
    const genreSlugs = genres.map(g => g.slug);

    // 2. Validate Language References
    const languages = await LanguageRepository.findByIds(movieData.languageIds);
    if (languages.length !== movieData.languageIds.length) {
      throw new ValidationError('One or more specified languageIds do not exist or are inactive');
    }

    if (movieData.originalLanguageId) {
      const origLang = await LanguageRepository.findById(movieData.originalLanguageId);
      if (!origLang) {
        throw new ValidationError('Specified originalLanguageId does not exist');
      }
    }

    // 3. Validate Trailer URL if provided
    if (movieData.trailerUrl && !MediaService.validateTrailerUrl(movieData.trailerUrl)) {
      throw new ValidationError('Trailer URL must be a valid YouTube or Vimeo streaming link');
    }

    // 4. Generate unique slug
    const finalSlug = await generateUniqueSlug(movieData.slug || movieData.title, slug =>
      MovieRepository.existsBySlug(slug)
    );

    // 5. Determine initial status and approval metadata
    let initialStatus = movieData.status || MovieStatus.DRAFT;
    let approvedBy = null;
    let approvedAt = null;

    if (initialStatus === MovieStatus.APPROVED && actorRole === 'SUPER_ADMIN') {
      initialStatus = deriveTheatricalStatus({
        status: MovieStatus.APPROVED,
        releaseDate: movieData.releaseDate,
        endDate: movieData.endDate
      });
      approvedBy = actorId;
      approvedAt = new Date();
    }

    // 6. Persist movie document
    const movie = await MovieRepository.create({
      ...movieData,
      slug: finalSlug,
      genreSlugs,
      status: initialStatus,
      approvedBy,
      approvedAt,
      createdBy: actorId,
      updatedBy: actorId
    });

    // 7. Audit Log
    await AuthRepository.createAuditLog({
      actorId,
      actorRole,
      action: 'MOVIE_CREATED',
      targetResource: 'movies',
      targetId: movie._id,
      details: { title: movie.title, slug: finalSlug, status: initialStatus }
    });

    return MovieRepository.findById(movie._id);
  }

  /**
   * Retrieve movies with admin search, filtering, and pagination
   */
  static async getAdminMovies({
    page = 1,
    limit = 20,
    search = '',
    status = null,
    genre = null,
    language = null,
    certification = null,
    releaseDateFrom = null,
    releaseDateTo = null,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  }) {
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (certification) {
      filter.censorRating = certification;
    }

    if (genre) {
      filter.genreSlugs = genre.toLowerCase();
    }

    if (language) {
      // Allow language code (e.g. "hi") or ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(language)) {
        filter.languageIds = language;
      } else {
        const langDoc = await LanguageRepository.findByCode(language);
        if (langDoc) {
          filter.languageIds = langDoc._id;
        }
      }
    }

    if (releaseDateFrom || releaseDateTo) {
      filter.releaseDate = {};
      if (releaseDateFrom) {
        filter.releaseDate.$gte = new Date(releaseDateFrom);
      }
      if (releaseDateTo) {
        filter.releaseDate.$lte = new Date(releaseDateTo);
      }
    }

    if (search && search.trim()) {
      filter.title = { $regex: search.trim(), $options: 'i' };
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const { movies, total } = await MovieRepository.findAdminMovies({
      filter,
      page,
      limit,
      sort
    });

    return {
      movies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  /**
   * Get single movie by ID (Admin)
   */
  static async getAdminMovieById(movieId) {
    const movie = await MovieRepository.findById(movieId);
    if (!movie) {
      throw new NotFoundError('Movie not found', ErrorCodes.MOVIE_NOT_FOUND);
    }
    return movie;
  }

  /**
   * Update movie attributes
   */
  static async updateMovie(movieId, updateData, actorId = null, actorRole = 'SUPER_ADMIN') {
    const movie = await MovieRepository.findById(movieId);
    if (!movie) {
      throw new NotFoundError('Movie not found', ErrorCodes.MOVIE_NOT_FOUND);
    }

    const updateFields = { ...updateData };

    // 1. Status Transition Validation
    if (updateFields.status && updateFields.status !== movie.status) {
      if (
        !isAllowedStatusTransition(movie.status, updateFields.status) &&
        actorRole !== 'SUPER_ADMIN'
      ) {
        throw new ValidationError(
          `Invalid status transition from '${movie.status}' to '${updateFields.status}'`,
          ErrorCodes.INVALID_STATUS_TRANSITION
        );
      }

      if (updateFields.status === MovieStatus.APPROVED) {
        updateFields.status = deriveTheatricalStatus({
          status: MovieStatus.APPROVED,
          releaseDate: updateFields.releaseDate || movie.releaseDate,
          endDate: updateFields.endDate || movie.endDate
        });
        updateFields.approvedBy = actorId;
        updateFields.approvedAt = new Date();
        updateFields.rejectionReason = '';
      }
    }

    // 2. Genre validation if updated
    if (updateFields.genreIds) {
      const genres = await GenreRepository.findByIds(updateFields.genreIds);
      if (genres.length !== updateFields.genreIds.length) {
        throw new ValidationError('One or more specified genreIds do not exist');
      }
      updateFields.genreSlugs = genres.map(g => g.slug);
    }

    // 3. Language validation if updated
    if (updateFields.languageIds) {
      const languages = await LanguageRepository.findByIds(updateFields.languageIds);
      if (languages.length !== updateFields.languageIds.length) {
        throw new ValidationError('One or more specified languageIds do not exist');
      }
    }

    // 4. Trailer validation if updated
    if (updateFields.trailerUrl && !MediaService.validateTrailerUrl(updateFields.trailerUrl)) {
      throw new ValidationError('Trailer URL must be a valid YouTube or Vimeo streaming link');
    }

    // 5. Slug uniqueness check if updated
    if (updateFields.slug && updateFields.slug !== movie.slug) {
      const exists = await MovieRepository.existsBySlug(updateFields.slug, movieId);
      if (exists) {
        throw new ValidationError(
          'A movie with this slug already exists',
          ErrorCodes.DUPLICATE_RESOURCE
        );
      }
    }

    updateFields.updatedBy = actorId;

    const updatedMovie = await MovieRepository.update(movieId, updateFields);

    await AuthRepository.createAuditLog({
      actorId,
      actorRole,
      action: 'MOVIE_UPDATED',
      targetResource: 'movies',
      targetId: movieId,
      details: updateFields
    });

    return updatedMovie;
  }

  /**
   * Soft-delete / Archive movie
   */
  static async deleteMovie(movieId, actorId = null) {
    const movie = await MovieRepository.findById(movieId);
    if (!movie) {
      throw new NotFoundError('Movie not found', ErrorCodes.MOVIE_NOT_FOUND);
    }

    await MovieRepository.softDelete(movieId, actorId);

    await AuthRepository.createAuditLog({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'MOVIE_DELETED',
      targetResource: 'movies',
      targetId: movieId,
      details: { title: movie.title, slug: movie.slug }
    });

    return { message: 'Movie archived and removed from catalog successfully' };
  }

  /**
   * Approve movie (Admin API)
   */
  static async approveMovie(movieId, actorId = null) {
    const movie = await MovieRepository.findById(movieId);
    if (!movie) {
      throw new NotFoundError('Movie not found', ErrorCodes.MOVIE_NOT_FOUND);
    }

    const operationalStatus = deriveTheatricalStatus({
      status: MovieStatus.APPROVED,
      releaseDate: movie.releaseDate,
      endDate: movie.endDate
    });

    const updated = await MovieRepository.update(movieId, {
      status: operationalStatus,
      approvedBy: actorId,
      approvedAt: new Date(),
      rejectionReason: '',
      updatedBy: actorId
    });

    await AuthRepository.createAuditLog({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'MOVIE_APPROVED',
      targetResource: 'movies',
      targetId: movieId,
      details: { previousStatus: movie.status, newStatus: operationalStatus }
    });

    return updated;
  }

  /**
   * Reject movie (Admin API)
   */
  static async rejectMovie(movieId, reason, actorId = null) {
    const movie = await MovieRepository.findById(movieId);
    if (!movie) {
      throw new NotFoundError('Movie not found', ErrorCodes.MOVIE_NOT_FOUND);
    }

    const updated = await MovieRepository.update(movieId, {
      status: MovieStatus.REJECTED,
      rejectionReason: reason.trim(),
      updatedBy: actorId
    });

    await AuthRepository.createAuditLog({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'MOVIE_REJECTED',
      targetResource: 'movies',
      targetId: movieId,
      details: { previousStatus: movie.status, reason }
    });

    return updated;
  }

  /**
   * Public movie catalog browsing
   */
  static async getPublicMovies({
    page = 1,
    limit = 20,
    search = '',
    genre = null,
    language = null,
    certification = null,
    format = null,
    releaseDateFrom = null,
    releaseDateTo = null,
    sortBy = 'releaseDate',
    sortOrder = 'desc'
  }) {
    const filter = {};

    if (certification) {
      filter.censorRating = certification;
    }

    if (genre) {
      filter.genreSlugs = genre.toLowerCase();
    }

    if (language) {
      if (/^[0-9a-fA-F]{24}$/.test(language)) {
        filter.languageIds = language;
      } else {
        const langDoc = await LanguageRepository.findByCode(language);
        if (langDoc) {
          filter.languageIds = langDoc._id;
        }
      }
    }

    if (format) {
      filter.availableFormats = format;
    }

    if (releaseDateFrom || releaseDateTo) {
      filter.releaseDate = {};
      if (releaseDateFrom) {
        filter.releaseDate.$gte = new Date(releaseDateFrom);
      }
      if (releaseDateTo) {
        filter.releaseDate.$lte = new Date(releaseDateTo);
      }
    }

    if (search && search.trim()) {
      filter.title = { $regex: search.trim(), $options: 'i' };
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const { movies, total } = await MovieRepository.findPublicMovies({
      filter,
      page,
      limit,
      sort
    });

    return {
      movies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  /**
   * Get upcoming movies (Public)
   */
  static async getUpcomingMovies(query = {}) {
    return this.getPublicMovies({
      ...query,
      sortBy: 'releaseDate',
      sortOrder: 'asc',
      releaseDateFrom: new Date().toISOString()
    });
  }

  /**
   * Get now-showing movies (Public)
   */
  static async getNowShowingMovies(query = {}) {
    return this.getPublicMovies({
      ...query,
      sortBy: 'avgRating',
      sortOrder: 'desc',
      releaseDateTo: new Date().toISOString()
    });
  }

  /**
   * Get movie details by slug (Public)
   */
  static async getMovieBySlug(slug) {
    const movie = await MovieRepository.findBySlug(slug, { onlyPublic: true });
    if (!movie) {
      throw new NotFoundError(
        `Movie with slug '${slug}' not found or is currently not publicly available`,
        ErrorCodes.MOVIE_NOT_FOUND
      );
    }

    return {
      id: movie._id,
      title: movie.title,
      originalTitle: movie.originalTitle,
      slug: movie.slug,
      synopsis: movie.synopsis,
      shortDescription: movie.shortDescription,
      durationMins: movie.durationMins,
      releaseDate: movie.releaseDate,
      endDate: movie.endDate,
      censorRating: movie.censorRating,
      productionCountry: movie.productionCountry,
      genres: movie.genreIds,
      languages: movie.languageIds,
      originalLanguage: movie.originalLanguageId,
      availableFormats: movie.availableFormats,
      cast: movie.cast,
      crew: movie.crew,
      posterUrl: movie.posterUrl,
      bannerUrl: movie.bannerUrl,
      backdropUrl: movie.backdropUrl,
      trailerUrl: movie.trailerUrl,
      galleryImages: movie.galleryImages,
      status: movie.status,
      avgRating: movie.avgRating,
      totalReviews: movie.totalReviews
    };
  }
}

export default MovieService;
