import GenreRepository from './genre.repository.js';
import { slugify } from './movie.utils.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import ErrorCodes from '../../common/constants/error-codes.js';
import AuthRepository from '../auth/auth.repository.js';

export class GenreService {
  static async createGenre({ name, slug, description = '', actorId = null }) {
    const cleanName = name.trim();
    const existingName = await GenreRepository.findByName(cleanName);
    if (existingName) {
      throw new ConflictError(
        'A genre with this name already exists',
        ErrorCodes.DUPLICATE_RESOURCE
      );
    }

    const cleanSlug = slugify(slug || cleanName);
    const existingSlug = await GenreRepository.findBySlug(cleanSlug);
    if (existingSlug) {
      throw new ConflictError(
        'A genre with this slug already exists',
        ErrorCodes.DUPLICATE_RESOURCE
      );
    }

    const genre = await GenreRepository.create({
      name: cleanName,
      slug: cleanSlug,
      description: description.trim()
    });

    await AuthRepository.createAuditLog({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'GENRE_CREATED',
      targetResource: 'genres',
      targetId: genre._id,
      details: { name: cleanName, slug: cleanSlug }
    });

    return genre;
  }

  static async getGenres() {
    return GenreRepository.findActive();
  }

  static async updateGenre(genreId, updateData, actorId = null) {
    const genre = await GenreRepository.findById(genreId);
    if (!genre) {
      throw new NotFoundError('Genre not found', ErrorCodes.GENRE_NOT_FOUND);
    }

    if (updateData.name && updateData.name.trim().toLowerCase() !== genre.name.toLowerCase()) {
      const existing = await GenreRepository.findByName(updateData.name.trim());
      if (existing) {
        throw new ConflictError(
          'Another genre with this name already exists',
          ErrorCodes.DUPLICATE_RESOURCE
        );
      }
    }

    const updated = await GenreRepository.update(genreId, updateData);

    await AuthRepository.createAuditLog({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'GENRE_UPDATED',
      targetResource: 'genres',
      targetId: genreId,
      details: updateData
    });

    return updated;
  }

  static async deleteGenre(genreId, actorId = null) {
    const genre = await GenreRepository.findById(genreId);
    if (!genre) {
      throw new NotFoundError('Genre not found', ErrorCodes.GENRE_NOT_FOUND);
    }

    const isUsed = await GenreRepository.isReferencedInMovies(genreId);
    if (isUsed) {
      throw new ConflictError(
        'Cannot delete genre currently referenced by active movies',
        ErrorCodes.RESOURCE_IN_USE
      );
    }

    await GenreRepository.softDelete(genreId);

    await AuthRepository.createAuditLog({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'GENRE_DELETED',
      targetResource: 'genres',
      targetId: genreId,
      details: { name: genre.name, slug: genre.slug }
    });

    return { message: 'Genre deleted successfully' };
  }
}

export default GenreService;
