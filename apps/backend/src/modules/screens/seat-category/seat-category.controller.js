import SeatCategoryService from './seat-category.service.js';
import ApiResponse from '../../../common/responses/api-response.js';

export class SeatCategoryController {
  /**
   * Create a new seat category
   */
  static async createCategory(req, res, next) {
    try {
      const category = await SeatCategoryService.createCategory(req.body, req.user);
      return ApiResponse.created(res, {
        message: 'Seat category created successfully',
        data: category
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get all categories available for partner
   */
  static async getPartnerCategories(req, res, next) {
    try {
      const categories = await SeatCategoryService.getCategoriesForPartner(req.user.partnerId);
      return ApiResponse.success(res, {
        message: 'Seat categories retrieved successfully',
        data: categories
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get category by ID
   */
  static async getCategoryById(req, res, next) {
    try {
      const category = await SeatCategoryService.getCategoryById(
        req.params.categoryId,
        req.user.partnerId,
        req.user.role
      );
      return ApiResponse.success(res, {
        message: 'Seat category details retrieved successfully',
        data: category
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update category
   */
  static async updateCategory(req, res, next) {
    try {
      const updated = await SeatCategoryService.updateCategory(
        req.params.categoryId,
        req.body,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Seat category updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Delete category
   */
  static async deleteCategory(req, res, next) {
    try {
      const result = await SeatCategoryService.deleteCategory(req.params.categoryId, req.user);
      return ApiResponse.success(res, {
        message: result.message,
        data: null
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default SeatCategoryController;
