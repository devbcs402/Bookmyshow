import LanguageRepository from './language.repository.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import ErrorCodes from '../../common/constants/error-codes.js';
import AuthRepository from '../auth/auth.repository.js';

export class LanguageService {
  static async createLanguage({ name, code, nativeName = '', actorId = null }) {
    const cleanName = name.trim();
    const cleanCode = code.trim().toLowerCase();

    const existingName = await LanguageRepository.findByName(cleanName);
    if (existingName) {
      throw new ConflictError(
        'A language with this name already exists',
        ErrorCodes.DUPLICATE_RESOURCE
      );
    }

    const existingCode = await LanguageRepository.findByCode(cleanCode);
    if (existingCode) {
      throw new ConflictError(
        'A language with this code already exists',
        ErrorCodes.DUPLICATE_RESOURCE
      );
    }

    const lang = await LanguageRepository.create({
      name: cleanName,
      code: cleanCode,
      nativeName: nativeName.trim()
    });

    await AuthRepository.createAuditLog({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'LANGUAGE_CREATED',
      targetResource: 'languages',
      targetId: lang._id,
      details: { name: cleanName, code: cleanCode }
    });

    return lang;
  }

  static async getLanguages() {
    return LanguageRepository.findActive();
  }

  static async updateLanguage(languageId, updateData, actorId = null) {
    const lang = await LanguageRepository.findById(languageId);
    if (!lang) {
      throw new NotFoundError('Language not found', ErrorCodes.LANGUAGE_NOT_FOUND);
    }

    if (updateData.name && updateData.name.trim().toLowerCase() !== lang.name.toLowerCase()) {
      const existing = await LanguageRepository.findByName(updateData.name.trim());
      if (existing) {
        throw new ConflictError(
          'Another language with this name already exists',
          ErrorCodes.DUPLICATE_RESOURCE
        );
      }
    }

    const updated = await LanguageRepository.update(languageId, updateData);

    await AuthRepository.createAuditLog({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'LANGUAGE_UPDATED',
      targetResource: 'languages',
      targetId: languageId,
      details: updateData
    });

    return updated;
  }

  static async deleteLanguage(languageId, actorId = null) {
    const lang = await LanguageRepository.findById(languageId);
    if (!lang) {
      throw new NotFoundError('Language not found', ErrorCodes.LANGUAGE_NOT_FOUND);
    }

    const isUsed = await LanguageRepository.isReferencedInMovies(languageId);
    if (isUsed) {
      throw new ConflictError(
        'Cannot delete language currently referenced by active movies',
        ErrorCodes.RESOURCE_IN_USE
      );
    }

    await LanguageRepository.softDelete(languageId);

    await AuthRepository.createAuditLog({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'LANGUAGE_DELETED',
      targetResource: 'languages',
      targetId: languageId,
      details: { name: lang.name, code: lang.code }
    });

    return { message: 'Language deleted successfully' };
  }
}

export default LanguageService;
