import GenreService from './genre.service.js';
import ApiResponse from '../../common/responses/api-response.js';

export class GenreController {
  static async createGenre(req, res, next) {
    try {
      const genre = await GenreService.createGenre({
        ...req.body,
        actorId: req.user?.id
      });
      return ApiResponse.created(res, {
        message: 'Genre created successfully',
        data: genre
      });
    } catch (error) {
      next(error);
    }
  }

  static async getGenres(req, res, next) {
    try {
      const genres = await GenreService.getGenres();
      return ApiResponse.success(res, {
        message: 'Genres retrieved successfully',
        data: genres
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateGenre(req, res, next) {
    try {
      const genre = await GenreService.updateGenre(req.params.genreId, req.body, req.user?.id);
      return ApiResponse.success(res, {
        message: 'Genre updated successfully',
        data: genre
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteGenre(req, res, next) {
    try {
      const result = await GenreService.deleteGenre(req.params.genreId, req.user?.id);
      return ApiResponse.success(res, {
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

export default GenreController;
