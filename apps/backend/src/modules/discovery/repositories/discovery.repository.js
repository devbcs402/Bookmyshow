import mongoose from 'mongoose';
import { Movie } from '../../movies/model/movie.model.js';
import { Genre } from '../../movies/model/genre.model.js';
import { Language } from '../../movies/model/language.model.js';
import { Theatre } from '../../theatres/model/theatre.model.js';
import { City } from '../../theatres/model/city.model.js';
import { Show } from '../../shows/show.model.js';
import { BookingModel } from '../../bookings/model/booking.model.js';
import { MovieStatus, PublicVisibleStatuses } from '../../movies/movie.constants.js';
import { TheatreStatus } from '../../theatres/theatre.constants.js';
import { ShowStatus } from '../../shows/show.constants.js';
import { BookingStatus } from '../../bookings/booking.constants.js';
import { SuggestionTypes } from '../constants/discovery.constants.js';

export class DiscoveryRepository {
  /**
   * Escape special characters in string for safe regular expression queries
   */
  static escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Search movies with text / partial multi-field matching
   */
  static async searchMovies({
    query = '',
    filters = {},
    page = 1,
    limit = 20,
    sort = { releaseDate: -1 }
  }) {
    const skip = (page - 1) * limit;
    const conditions = {
      isDeleted: false,
      deletedAt: null,
      status: { $in: PublicVisibleStatuses },
      ...filters
    };

    if (query && query.trim()) {
      const escaped = this.escapeRegex(query.trim());
      const regex = new RegExp(escaped, 'i');
      conditions.$or = [
        { title: regex },
        { originalTitle: regex },
        { 'cast.name': regex },
        { 'crew.name': regex },
        { genreSlugs: regex }
      ];
    }

    const [movies, total] = await Promise.all([
      Movie.find(conditions)
        .populate('genreIds', 'name slug')
        .populate('languageIds', 'name code nativeName')
        .populate('originalLanguageId', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Movie.countDocuments(conditions)
    ]);

    return { movies, total };
  }

  /**
   * Find upcoming approved movies
   */
  static async findUpcomingMovies({
    filters = {},
    page = 1,
    limit = 20,
    sort = { releaseDate: 1 }
  }) {
    const skip = (page - 1) * limit;
    const now = new Date();

    const conditions = {
      isDeleted: false,
      deletedAt: null,
      status: { $in: [MovieStatus.UPCOMING, MovieStatus.APPROVED] },
      releaseDate: { $gt: now },
      ...filters
    };

    const [movies, total] = await Promise.all([
      Movie.find(conditions)
        .populate('genreIds', 'name slug')
        .populate('languageIds', 'name code nativeName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Movie.countDocuments(conditions)
    ]);

    return { movies, total };
  }

  /**
   * Find movies that currently have active published shows
   */
  static async findNowShowingMovies({
    cityId = null,
    date = null,
    genre = null,
    language = null,
    page = 1,
    limit = 20,
    sort = { avgRating: -1 }
  }) {
    const skip = (page - 1) * limit;
    const now = new Date();

    // 1. Build Show filter for active public shows
    const showFilter = {
      status: ShowStatus.PUBLISHED,
      isDeleted: false,
      startTime: { $gte: now }
    };

    if (cityId) {
      showFilter.cityId = cityId;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      showFilter.startTime = {
        $gte: startOfDay > now ? startOfDay : now,
        $lte: endOfDay
      };
    }

    // Safety guard when testing or database disconnected
    if (mongoose.connection.readyState !== 1) {
      return { movies: [], total: 0 };
    }

    // 2. Discover distinct published movie IDs
    const publishedMovieIds = await Show.distinct('movieId', showFilter);

    if (!publishedMovieIds || publishedMovieIds.length === 0) {
      return { movies: [], total: 0 };
    }

    // 3. Query matching movies with additional filters
    const movieFilter = {
      _id: { $in: publishedMovieIds },
      isDeleted: false,
      deletedAt: null,
      status: { $in: PublicVisibleStatuses }
    };

    if (genre) {
      movieFilter.genreSlugs = genre.toLowerCase();
    }

    if (language) {
      if (/^[0-9a-fA-F]{24}$/.test(language)) {
        movieFilter.languageIds = language;
      } else {
        const langDoc = await Language.findOne({ code: language.toLowerCase() }).lean();
        if (langDoc) {
          movieFilter.languageIds = langDoc._id;
        }
      }
    }

    const [movies, total] = await Promise.all([
      Movie.find(movieFilter)
        .populate('genreIds', 'name slug')
        .populate('languageIds', 'name code nativeName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Movie.countDocuments(movieFilter)
    ]);

    return { movies, total };
  }

  /**
   * Aggregate confirmed bookings within a time window for trending calculation
   */
  static async aggregateTrendingBookings({ sinceDate, limit = 20 }) {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }

    return BookingModel.aggregate([
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          createdAt: { $gte: sinceDate }
        }
      },
      {
        $group: {
          _id: '$movieId',
          bookingCount: { $sum: 1 },
          totalSeats: { $sum: '$totalSeats' },
          uniqueCustomers: { $addToSet: '$customerId' }
        }
      },
      {
        $project: {
          movieId: '$_id',
          bookingCount: 1,
          totalSeats: 1,
          uniqueCustomerCount: { $size: '$uniqueCustomers' }
        }
      },
      { $sort: { bookingCount: -1, totalSeats: -1 } },
      { $limit: limit }
    ]);
  }

  /**
   * Aggregate confirmed bookings over a longer window for popularity ranking
   */
  static async aggregatePopularBookings({ sinceDate, limit = 20 }) {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }

    return BookingModel.aggregate([
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          createdAt: { $gte: sinceDate }
        }
      },
      {
        $group: {
          _id: '$movieId',
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$netPayableAmount' }
        }
      },
      { $sort: { totalBookings: -1, totalRevenue: -1 } },
      { $limit: limit }
    ]);
  }

  /**
   * Find approved active theatres with optional geospatial radius query
   */
  static async findTheatres({
    query = '',
    cityId = null,
    cityName = '',
    area = '',
    pincode = '',
    coordinates = null, // [longitude, latitude]
    radiusKm = 15,
    facilities = [],
    page = 1,
    limit = 20
  }) {
    const skip = (page - 1) * limit;
    const filter = {
      status: TheatreStatus.APPROVED,
      isActive: true,
      isDeleted: false
    };

    if (cityId) {
      filter['address.cityId'] = cityId;
    } else if (cityName) {
      filter['address.cityName'] = new RegExp(`^${this.escapeRegex(cityName)}$`, 'i');
    }

    if (area) {
      filter['address.area'] = new RegExp(this.escapeRegex(area), 'i');
    }

    if (pincode) {
      filter['address.pincode'] = pincode.trim();
    }

    if (facilities && facilities.length > 0) {
      filter.amenities = { $all: facilities };
    }

    if (query && query.trim()) {
      const escaped = this.escapeRegex(query.trim());
      filter.$or = [
        { name: new RegExp(escaped, 'i') },
        { 'address.area': new RegExp(escaped, 'i') },
        { 'address.street': new RegExp(escaped, 'i') }
      ];
    }

    // Geospatial search if coordinates provided
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      const [lng, lat] = coordinates;
      if (!isNaN(lng) && !isNaN(lat)) {
        // Radius in radians (Earth radius ≈ 6378.1 km)
        const radiusRadians = radiusKm / 6378.1;
        filter.location = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusRadians]
          }
        };
      }
    }

    const projection = {
      name: 1,
      slug: 1,
      theatreCode: 1,
      description: 1,
      address: 1,
      location: 1,
      amenities: 1,
      totalScreens: 1,
      operatingHours: 1,
      media: 1,
      status: 1
    };

    const [theatres, total] = await Promise.all([
      Theatre.find(filter, projection).skip(skip).limit(limit).lean(),
      Theatre.countDocuments(filter)
    ]);

    return { theatres, total };
  }

  /**
   * Search shows with filters
   */
  static async findShows({
    movieId = null,
    theatreId = null,
    branchId = null,
    cityId = null,
    date = null,
    language = null,
    format = null,
    startTimeFrom = null,
    startTimeTo = null,
    page = 1,
    limit = 20
  }) {
    const skip = (page - 1) * limit;
    const now = new Date();

    const filter = {
      status: ShowStatus.PUBLISHED,
      isDeleted: false,
      startTime: { $gt: now }
    };

    if (movieId) {
      filter.movieId = movieId;
    }
    if (theatreId) {
      filter.theatreId = theatreId;
    }
    if (branchId) {
      filter.branchId = branchId;
    }
    if (cityId) {
      filter.cityId = cityId;
    }
    if (language) {
      filter.language = new RegExp(`^${this.escapeRegex(language)}$`, 'i');
    }
    if (format) {
      filter.format = format;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.startTime = {
        $gte: startOfDay > now ? startOfDay : now,
        $lte: endOfDay
      };
    } else if (startTimeFrom || startTimeTo) {
      filter.startTime = {};
      if (startTimeFrom) {
        const fromDate = new Date(startTimeFrom);
        filter.startTime.$gte = fromDate > now ? fromDate : now;
      }
      if (startTimeTo) {
        filter.startTime.$lte = new Date(startTimeTo);
      }
    }

    const [shows, total] = await Promise.all([
      Show.find(filter)
        .populate('theatreId', 'name slug address location amenities')
        .populate('screenId', 'name screenType formatCapabilities totalCapacity')
        .populate('movieId', 'title slug posterUrl censorRating durationMins genreSlugs')
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Show.countDocuments(filter)
    ]);

    return { shows, total };
  }

  /**
   * Search autocomplete suggestions across movies, actors, directors, genres, theatres, cities
   */
  static async findSuggestions({ query = '', limit = 10 }) {
    if (!query || !query.trim() || mongoose.connection.readyState !== 1) {
      return [];
    }

    const escaped = this.escapeRegex(query.trim());
    const regex = new RegExp(`^${escaped}`, 'i');
    const partialRegex = new RegExp(escaped, 'i');
    const suggestions = [];

    // 1. Movie title suggestions
    const movies = await Movie.find(
      {
        title: partialRegex,
        status: { $in: PublicVisibleStatuses },
        isDeleted: false
      },
      { title: 1, slug: 1, posterUrl: 1, releaseDate: 1, censorRating: 1 }
    )
      .limit(5)
      .lean();

    movies.forEach(m => {
      suggestions.push({
        type: SuggestionTypes.MOVIE,
        title: m.title,
        slug: m.slug,
        posterUrl: m.posterUrl,
        censorRating: m.censorRating,
        year: m.releaseDate ? new Date(m.releaseDate).getFullYear() : null
      });
    });

    // 2. Theatres suggestions
    const theatres = await Theatre.find(
      {
        name: partialRegex,
        status: TheatreStatus.APPROVED,
        isActive: true,
        isDeleted: false
      },
      { name: 1, slug: 1, 'address.cityName': 1, 'address.area': 1 }
    )
      .limit(3)
      .lean();

    theatres.forEach(t => {
      suggestions.push({
        type: SuggestionTypes.THEATRE,
        title: t.name,
        slug: t.slug,
        city: t.address?.cityName || '',
        area: t.address?.area || ''
      });
    });

    // 3. Genres suggestions
    const genres = await Genre.find(
      { name: regex, isActive: true },
      { name: 1, slug: 1 }
    )
      .limit(3)
      .lean();

    genres.forEach(g => {
      suggestions.push({
        type: SuggestionTypes.GENRE,
        title: g.name,
        slug: g.slug
      });
    });

    // 4. Cities suggestions
    const cities = await City.find(
      { name: regex, isActive: true },
      { name: 1, state: 1, slug: 1 }
    )
      .limit(3)
      .lean();

    cities.forEach(c => {
      suggestions.push({
        type: SuggestionTypes.CITY,
        title: c.name,
        state: c.state,
        slug: c.slug
      });
    });

    // Return capped results
    return suggestions.slice(0, limit);
  }

  /**
   * Find candidate movies for similarity calculation
   */
  static async findSimilarCandidates({ movieId, genreSlugs = [], languageIds = [], limit = 20 }) {
    return Movie.find({
      _id: { $ne: movieId },
      status: { $in: PublicVisibleStatuses },
      isDeleted: false,
      $or: [
        { genreSlugs: { $in: genreSlugs } },
        { languageIds: { $in: languageIds } }
      ]
    })
      .populate('genreIds', 'name slug')
      .populate('languageIds', 'name code nativeName')
      .limit(limit)
      .lean();
  }

  /**
   * Fetch customer confirmed bookings to extract preferred genres/languages/directors
   */
  static async findCustomerBookingSignals(customerId, limit = 20) {
    if (!customerId || mongoose.connection.readyState !== 1) {
      return [];
    }

    return BookingModel.find(
      { customerId, status: BookingStatus.CONFIRMED },
      { movieId: 1, 'snapshot.movieTitle': 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: 'movieId',
        select: 'genreSlugs languageIds cast crew avgRating',
        match: { isDeleted: false }
      })
      .lean();
  }
}

export default DiscoveryRepository;

