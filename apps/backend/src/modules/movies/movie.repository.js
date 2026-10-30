import { Movie } from './model/movie.model.js';
import { PublicVisibleStatuses } from './movie.constants.js';

export class MovieRepository {
  static async create(movieData, session = null) {
    const movie = new Movie(movieData);
    return movie.save({ session });
  }

  static async findById(id, { populate = true, includeDeleted = false } = {}) {
    const query = Movie.findOne({
      _id: id,
      ...(includeDeleted ? {} : { isDeleted: false, deletedAt: null })
    });

    if (populate) {
      query
        .populate('genreIds', 'name slug')
        .populate('languageIds', 'name code nativeName')
        .populate('originalLanguageId', 'name code');
    }

    return query.exec();
  }

  static async findBySlug(slug, { populate = true, onlyPublic = true } = {}) {
    const query = Movie.findOne({
      slug: slug.toLowerCase(),
      isDeleted: false,
      deletedAt: null,
      ...(onlyPublic ? { status: { $in: PublicVisibleStatuses } } : {})
    });

    if (populate) {
      query
        .populate('genreIds', 'name slug')
        .populate('languageIds', 'name code nativeName')
        .populate('originalLanguageId', 'name code');
    }

    return query.exec();
  }

  static async existsBySlug(slug, excludeId = null) {
    const count = await Movie.countDocuments({
      slug: slug.toLowerCase(),
      ...(excludeId ? { _id: { $ne: excludeId } } : {})
    });
    return count > 0;
  }

  static async update(id, updateData, session = null) {
    return Movie.findOneAndUpdate(
      { _id: id, isDeleted: false, deletedAt: null },
      { $set: updateData },
      { new: true, session }
    )
      .populate('genreIds', 'name slug')
      .populate('languageIds', 'name code nativeName')
      .exec();
  }

  static async softDelete(id, userId = null) {
    return Movie.findOneAndUpdate(
      { _id: id, isDeleted: false, deletedAt: null },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedBy: userId
        }
      },
      { new: true }
    ).exec();
  }

  static async findAdminMovies({ filter = {}, page = 1, limit = 20, sort = { createdAt: -1 } }) {
    const skip = (page - 1) * limit;

    const baseFilter = {
      isDeleted: false,
      deletedAt: null,
      ...filter
    };

    const [movies, total] = await Promise.all([
      Movie.find(baseFilter)
        .populate('genreIds', 'name slug')
        .populate('languageIds', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Movie.countDocuments(baseFilter)
    ]);

    return { movies, total };
  }

  static async findPublicMovies({ filter = {}, page = 1, limit = 20, sort = { releaseDate: -1 } }) {
    const skip = (page - 1) * limit;

    const baseFilter = {
      isDeleted: false,
      deletedAt: null,
      status: { $in: PublicVisibleStatuses },
      ...filter
    };

    const [movies, total] = await Promise.all([
      Movie.find(baseFilter)
        .populate('genreIds', 'name slug')
        .populate('languageIds', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Movie.countDocuments(baseFilter)
    ]);

    return { movies, total };
  }
}

export default MovieRepository;
