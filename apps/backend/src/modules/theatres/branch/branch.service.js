import TheatreService from '../theatre.service.js';
import TheatreRepository from '../theatre.repository.js';
import Theatre from '../model/theatre.model.js';
import { NotFoundError } from '../../../common/errors/not-found.error.js';
import ErrorCodes from '../../../common/constants/error-codes.js';

/**
 * Branch Service
 * Implements physical cinema branch management.
 * In the approved architecture, cinema properties (theatres) represent branches
 * owned by the parent commercial entity (`theatre_partners`).
 */
export class BranchService {
  /**
   * Create a branch for an owner's theatre complex
   */
  static async createBranch(parentTheatreId, branchData, userContext) {
    // 1. Verify parent theatre exists and belongs to the authenticated partner
    const parentTheatre = await TheatreRepository.findByIdAndPartnerId(
      parentTheatreId,
      userContext.partnerId
    );
    if (!parentTheatre) {
      throw new NotFoundError(
        'Parent theatre not found under your organization',
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }

    // 2. Register branch with parent reference
    const branchPayload = {
      ...branchData,
      isBranch: true,
      parentTheatreId: parentTheatre._id
    };

    return TheatreService.registerTheatre(branchPayload, userContext);
  }

  /**
   * List all branches associated with a parent theatre or partner
   */
  static async listBranches(parentTheatreId, userContext) {
    const parentTheatre = await TheatreRepository.findByIdAndPartnerId(
      parentTheatreId,
      userContext.partnerId
    );
    if (!parentTheatre) {
      throw new NotFoundError(
        'Parent theatre not found under your organization',
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }

    const branches = await Theatre.find({
      $or: [{ parentTheatreId: parentTheatre._id }, { _id: parentTheatre._id }],
      partnerId: userContext.partnerId,
      isDeleted: false
    })
      .populate('address.cityId', 'name slug state')
      .sort({ createdAt: -1 })
      .lean();

    return branches;
  }

  /**
   * Get single branch details with owner verification
   */
  static async getBranchById(branchId, userContext) {
    const branch = await TheatreRepository.findByIdAndPartnerId(branchId, userContext.partnerId);
    if (!branch) {
      throw new NotFoundError(
        'Branch not found under your organization',
        ErrorCodes.BRANCH_NOT_FOUND
      );
    }
    return branch;
  }

  /**
   * Update branch details
   */
  static async updateBranch(branchId, updateData, userContext) {
    return TheatreService.updateTheatre(branchId, updateData, userContext);
  }

  /**
   * Toggle branch operational status (active / inactive)
   */
  static async toggleBranchStatus(branchId, isActive, userContext) {
    const existing = await TheatreRepository.findByIdAndPartnerId(branchId, userContext.partnerId);
    if (!existing) {
      throw new NotFoundError(
        'Branch not found under your organization',
        ErrorCodes.BRANCH_NOT_FOUND
      );
    }

    return TheatreRepository.updateWithPartner(branchId, userContext.partnerId, {
      isActive: Boolean(isActive)
    });
  }

  /**
   * Delete / archive branch
   */
  static async deleteBranch(branchId, userContext) {
    return TheatreService.softDeleteTheatre(branchId, userContext);
  }
}

export default BranchService;
