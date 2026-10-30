import SeatCategoryRepository from './seat-category.repository.js';
import { DefaultSeatCategories } from '../screen.constants.js';
import { NotFoundError } from '../../../common/errors/not-found.error.js';
import { ConflictError } from '../../../common/errors/conflict.error.js';
import { AuthorizationError } from '../../../common/errors/authorization.error.js';
import ErrorCodes from '../../../common/constants/error-codes.js';
import { Roles } from '../../auth/auth.constants.js';

export class SeatCategoryService {
  /**
   * Create a new custom seat category for a partner (or platform default if admin)
   */
  static async createCategory(categoryData, userContext) {
    const partnerId = userContext.role === Roles.SYSTEM_ADMIN ? null : userContext.partnerId;

    if (!partnerId && userContext.role !== Roles.SYSTEM_ADMIN) {
      throw new AuthorizationError(
        'User is not associated with a theatre partner',
        ErrorCodes.TENANT_ACCESS_DENIED
      );
    }

    const code = String(categoryData.code).toUpperCase().trim();

    // Check if category with this code already exists for this tenant
    const existing = await SeatCategoryRepository.findExactByPartnerAndCode(partnerId, code);
    if (existing) {
      throw new ConflictError(
        `Seat category with code "${code}" already exists for this organization`,
        ErrorCodes.CONFLICT
      );
    }

    const category = await SeatCategoryRepository.create({
      ...categoryData,
      code,
      partnerId
    });

    return category;
  }

  /**
   * Get all active categories available for a partner
   */
  static async getCategoriesForPartner(partnerId) {
    return SeatCategoryRepository.findAllForPartner(partnerId);
  }

  /**
   * Get a category by ID with ownership verification
   */
  static async getCategoryById(categoryId, partnerId = null, userRole = null) {
    const category = await SeatCategoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Seat category not found', ErrorCodes.SEAT_CATEGORY_NOT_FOUND);
    }

    // If category is partner-specific and requester is not system admin
    if (
      category.partnerId &&
      userRole !== Roles.SYSTEM_ADMIN &&
      String(category.partnerId) !== String(partnerId)
    ) {
      throw new NotFoundError('Seat category not found', ErrorCodes.SEAT_CATEGORY_NOT_FOUND);
    }

    return category;
  }

  /**
   * Update category
   */
  static async updateCategory(categoryId, updateData, userContext) {
    const category = await SeatCategoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Seat category not found', ErrorCodes.SEAT_CATEGORY_NOT_FOUND);
    }

    // Platform default categories can only be edited by SYSTEM_ADMIN
    if (!category.partnerId && userContext.role !== Roles.SYSTEM_ADMIN) {
      throw new AuthorizationError(
        'Platform default seat categories cannot be modified by theatre partners',
        ErrorCodes.FORBIDDEN
      );
    }

    // Partner category ownership verification
    if (
      category.partnerId &&
      userContext.role !== Roles.SYSTEM_ADMIN &&
      String(category.partnerId) !== String(userContext.partnerId)
    ) {
      throw new NotFoundError('Seat category not found', ErrorCodes.SEAT_CATEGORY_NOT_FOUND);
    }

    const updated = await SeatCategoryRepository.updateById(categoryId, updateData);
    return updated;
  }

  /**
   * Soft delete category
   */
  static async deleteCategory(categoryId, userContext) {
    const category = await SeatCategoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Seat category not found', ErrorCodes.SEAT_CATEGORY_NOT_FOUND);
    }

    if (!category.partnerId && userContext.role !== Roles.SYSTEM_ADMIN) {
      throw new AuthorizationError(
        'Platform default seat categories cannot be deleted by theatre partners',
        ErrorCodes.FORBIDDEN
      );
    }

    if (
      category.partnerId &&
      userContext.role !== Roles.SYSTEM_ADMIN &&
      String(category.partnerId) !== String(userContext.partnerId)
    ) {
      throw new NotFoundError('Seat category not found', ErrorCodes.SEAT_CATEGORY_NOT_FOUND);
    }

    await SeatCategoryRepository.softDelete(categoryId);
    return { success: true, message: 'Seat category deleted successfully' };
  }

  /**
   * Seed default platform seat categories if not already present
   */
  static async seedDefaults() {
    for (const cat of DefaultSeatCategories) {
      const existing = await SeatCategoryRepository.findByCode(cat.code, null);
      if (!existing) {
        await SeatCategoryRepository.create({
          ...cat,
          partnerId: null
        });
      }
    }
  }
}

export default SeatCategoryService;

