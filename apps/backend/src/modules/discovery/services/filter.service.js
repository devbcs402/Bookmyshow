import { DiscoveryRepository } from '../repositories/discovery.repository.js';
import { Language } from '../../movies/model/language.model.js';
import { PublicVisibleStatuses, MovieSortFields } from '../../movies/movie.constants.js';
import { DiscoveryDefaults } from '../constants/discovery.constants.js';
import { ValidationError } from '../../../common/errors/index.js';
import { ErrorCodes } from '../../../common/constants/error-codes.js';

export class FilterService {
  /**
   * Filter publicly available movies with comprehensive search criteria
   */
  static async filterMovies({
    genre = null,
    language = null,
    releaseYear = null,
    certification = null,
    status = null,
    durationMin = null,
    durationMax = null,
    releaseDateFrom = null,
    releaseDateTo = null,
    cast = null,
    director = null,
    format = null,
    page = DiscoveryDefaults.DEFAULT_PAGE,
    limit = DiscoveryDefaults.DEFAULT_LIMIT,
    sortBy = MovieSortFields.RELEASE_DATE,
    sortOrder = 'desc'
  }) {
    const filters = {};

    // 1. Status Filter - STRICT SECURITY GUARD: Never allow unpublished or draft movies
    if (status) {
      if (!PublicVisibleStatuses.includes(status)) {
        throw new ValidationError(
          `Status '${status}' is not publicly discoverable`,
          ErrorCodes.UNAUTHORIZED_RESOURCE_ACCESS
        );
      }
      filters.status = status;
    } else {
      filters.status = { $in: PublicVisibleStatuses };
    }

    // 2. Genre Filter
    if (genre) {
      filters.genreSlugs = genre.toLowerCase().trim();
    }

    // 3. Language Filter
    if (language) {
      if (/^[0-9a-fA-F]{24}$/.test(language)) {
        filters.languageIds = language;
      } else {
        const langDoc = await Language.findOne({ code: language.toLowerCase() }).lean();
        if (langDoc) {
          filters.languageIds = langDoc._id;
        }
      }
    }

    // 4. Certification / Censor Rating
    if (certification) {
      filters.censorRating = certification;
    }

    // 5. Release Year
    if (releaseYear) {
      const year = parseInt(releaseYear, 10);
      if (!isNaN(year) && year >= 1900 && year <= 2100) {
        const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
        const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`);
        filters.releaseDate = { $gte: yearStart, $lte: yearEnd };
      }
    }

    // 6. Release Date Range
    if (releaseDateFrom || releaseDateTo) {
      filters.releaseDate = filters.releaseDate || {};
      if (releaseDateFrom) {
        filters.releaseDate.$gte = new Date(releaseDateFrom);
      }
      if (releaseDateTo) {
        filters.releaseDate.$lte = new Date(releaseDateTo);
      }
    }

    // 7. Duration Range
    if (durationMin !== null || durationMax !== null) {
      filters.durationMins = {};
      if (durationMin !== null) {
        filters.durationMins.$gte = Number(durationMin);
      }
      if (durationMax !== null) {
        filters.durationMins.$lte = Number(durationMax);
      }
    }

    // 8. Available Formats
    if (format) {
      filters.availableFormats = format;
    }

    // 9. Cast / Director Filter
    if (cast) {
      filters['cast.name'] = new RegExp(DiscoveryRepository.escapeRegex(cast.trim()), 'i');
    }

    if (director) {
      filters['crew'] = {
        $elemMatch: {
          role: 'DIRECTOR',
          name: new RegExp(DiscoveryRepository.escapeRegex(director.trim()), 'i')
        }
      };
    }

    // 10. Sorting
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const { movies, total } = await DiscoveryRepository.searchMovies({
      filters,
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
}

export default FilterService;
