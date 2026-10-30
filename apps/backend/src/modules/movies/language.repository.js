import { Language } from './model/language.model.js';
import { Movie } from './model/movie.model.js';

export class LanguageRepository {
  static async create(data) {
    const lang = new Language(data);
    return lang.save();
  }

  static async findById(id) {
    return Language.findOne({ _id: id, deletedAt: null }).exec();
  }

  static async findByName(name) {
    return Language.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      deletedAt: null
    }).exec();
  }

  static async findByCode(code) {
    return Language.findOne({ code: code.toLowerCase(), deletedAt: null }).exec();
  }

  static async findActive() {
    return Language.find({ isActive: true, deletedAt: null }).sort({ name: 1 }).lean();
  }

  static async findAll(filter = {}) {
    return Language.find({ ...filter, deletedAt: null })
      .sort({ name: 1 })
      .lean();
  }

  static async findByIds(ids) {
    return Language.find({ _id: { $in: ids }, deletedAt: null }).lean();
  }

  static async update(id, updateData) {
    return Language.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updateData },
      { new: true }
    ).exec();
  }

  static async softDelete(id) {
    return Language.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { isActive: false, deletedAt: new Date() } },
      { new: true }
    ).exec();
  }

  static async isReferencedInMovies(languageId) {
    const count = await Movie.countDocuments({
      $or: [{ languageIds: languageId }, { originalLanguageId: languageId }],
      isDeleted: false
    });
    return count > 0;
  }
}

export default LanguageRepository;
