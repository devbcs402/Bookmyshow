import SeatingLayoutService from './seating-layout.service.js';
import ApiResponse from '../../../common/responses/api-response.js';

export class SeatingLayoutController {
  /**
   * Get seating layout (draft, latest published, or specific version)
   */
  static async getLayout(req, res, next) {
    try {
      const layout = await SeatingLayoutService.getLayout(
        req.params.screenId,
        req.user,
        req.query.version
      );
      return ApiResponse.success(res, {
        message: layout ? 'Seating layout retrieved successfully' : 'No layout found for screen',
        data: layout
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Save or update draft seating layout
   */
  static async saveLayoutDraft(req, res, next) {
    try {
      const draft = await SeatingLayoutService.saveLayoutDraft(
        req.params.screenId,
        req.body,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Layout draft saved successfully',
        data: draft
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Validate seating layout without saving
   */
  static async validateLayout(req, res, next) {
    try {
      const result = await SeatingLayoutService.validateLayout(
        req.params.screenId,
        req.body.seats,
        req.user
      );
      return ApiResponse.success(res, {
        message: result.isValid ? 'Layout is valid' : 'Layout contains validation errors',
        data: result
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Generate layout seats in bulk from configuration
   */
  static async generateBulk(req, res, next) {
    try {
      const result = await SeatingLayoutService.generateBulk(
        req.params.screenId,
        req.body,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Seats generated successfully',
        data: result
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Preview layout and metadata
   */
  static async previewLayout(req, res, next) {
    try {
      const preview = await SeatingLayoutService.previewLayout(
        req.params.screenId,
        req.user,
        req.query.version
      );
      return ApiResponse.success(res, {
        message: 'Layout preview generated successfully',
        data: preview
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Publish layout
   */
  static async publishLayout(req, res, next) {
    try {
      const result = await SeatingLayoutService.publishLayout(req.params.screenId, req.user);
      return ApiResponse.success(res, {
        message: result.message,
        data: {
          layout: result.layout,
          version: result.version,
          totalSeats: result.totalSeats,
          bookableSeats: result.bookableSeats
        }
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get version history for screen
   */
  static async getLayoutVersions(req, res, next) {
    try {
      const versions = await SeatingLayoutService.getLayoutVersions(req.params.screenId, req.user);
      return ApiResponse.success(res, {
        message: 'Layout versions retrieved successfully',
        data: versions
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default SeatingLayoutController;
