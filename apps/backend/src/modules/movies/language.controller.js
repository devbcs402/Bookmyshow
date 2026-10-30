import LanguageService from './language.service.js';
import ApiResponse from '../../common/responses/api-response.js';

export class LanguageController {
  static async createLanguage(req, res, next) {
    try {
      const language = await LanguageService.createLanguage({
        ...req.body,
        actorId: req.user?.id
      });
      return ApiResponse.created(res, {
        message: 'Language created successfully',
        data: language
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLanguages(req, res, next) {
    try {
      const languages = await LanguageService.getLanguages();
      return ApiResponse.success(res, {
        message: 'Languages retrieved successfully',
        data: languages
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateLanguage(req, res, next) {
    try {
      const language = await LanguageService.updateLanguage(
        req.params.languageId,
        req.body,
        req.user?.id
      );
      return ApiResponse.success(res, {
        message: 'Language updated successfully',
        data: language
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteLanguage(req, res, next) {
    try {
      const result = await LanguageService.deleteLanguage(req.params.languageId, req.user?.id);
      return ApiResponse.success(res, {
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

export default LanguageController;
