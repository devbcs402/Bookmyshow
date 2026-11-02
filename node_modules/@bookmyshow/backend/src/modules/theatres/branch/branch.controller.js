import BranchService from './branch.service.js';
import ApiResponse from '../../../common/responses/api-response.js';

export class BranchController {
  static async createBranch(req, res, next) {
    try {
      const branch = await BranchService.createBranch(req.params.theatreId, req.body, req.user);
      return ApiResponse.created(res, {
        message: 'Branch created successfully',
        data: branch
      });
    } catch (error) {
      return next(error);
    }
  }

  static async listBranches(req, res, next) {
    try {
      const branches = await BranchService.listBranches(req.params.theatreId, req.user);
      return ApiResponse.success(res, {
        message: 'Branches retrieved successfully',
        data: branches
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getBranch(req, res, next) {
    try {
      const branch = await BranchService.getBranchById(req.params.branchId, req.user);
      return ApiResponse.success(res, {
        message: 'Branch retrieved successfully',
        data: branch
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateBranch(req, res, next) {
    try {
      const updated = await BranchService.updateBranch(req.params.branchId, req.body, req.user);
      return ApiResponse.success(res, {
        message: 'Branch updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  static async toggleStatus(req, res, next) {
    try {
      const updated = await BranchService.toggleBranchStatus(
        req.params.branchId,
        req.body.isActive,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Branch status updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  static async deleteBranch(req, res, next) {
    try {
      await BranchService.deleteBranch(req.params.branchId, req.user);
      return ApiResponse.success(res, {
        message: 'Branch deleted successfully',
        data: null
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default BranchController;
