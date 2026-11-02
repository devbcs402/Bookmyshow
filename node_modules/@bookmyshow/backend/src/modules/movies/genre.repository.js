import { Genre } from './model/genre.model.js';
import { Movie } from './model/movie.model.js';

export class GenreRepository {
  static async create(data) {
    const genre = new Genre(data);
    return genre.save();
  }

  static async findById(id) {
    return Genre.findOne({ _id: id, deletedAt: null }).exec();
  }

  static async findByName(name) {
    return Genre.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      deletedAt: null
    }).exec();
  }

  static async findBySlug(slug) {
    return Genre.findOne({ slug: slug.toLowerCase(), deletedAt: null }).exec();
  }

  static async findActive() {
    return Genre.find({ isActive: true, deletedAt: null }).sort({ name: 1 }).lean();
  }

  static async findAll(filter = {}) {
    return Genre.find({ ...filter, deletedAt: null })
      .sort({ name: 1 })
      .lean();
  }

  static async findByIds(ids) {
    return Genre.find({ _id: { $in: ids }, deletedAt: null }).lean();
  }

  static async update(id, updateData) {
    return Genre.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updateData },
      { new: true }
    ).exec();
  }

  static async softDelete(id) {
    return Genre.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { isActive: false, deletedAt: new Date() } },
      { new: true }
    ).exec();
  }

  static async isReferencedInMovies(genreId) {
    const count = await Movie.countDocuments({
      genreIds: genreId,
      isDeleted: false
    });
    return count > 0;
  }
}

export default GenreRepository;
