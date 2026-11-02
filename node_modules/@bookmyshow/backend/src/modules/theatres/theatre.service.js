import TheatreRepository from './theatre.repository.js';
import Theatre from './model/theatre.model.js';
import User from '../users/model/user.model.js';
import AuthRepository from '../auth/auth.repository.js';
import { TheatreStatus } from './theatre.constants.js';
import {
  generateUniqueTheatreSlug,
  isAllowedTheatreStatusTransition,
  validateCoordinates
} from './theatre.utils.js';
import { Roles } from '../auth/auth.constants.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { ValidationError } from '../../common/errors/validation.error.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import { AuthorizationError } from '../../common/errors/authorization.error.js';
import ErrorCodes from '../../common/constants/error-codes.js';

export class TheatreService {
  /* =========================================================================
   * 1. THEATRE OWNER OPERATIONS
   * ========================================================================= */

  /**
   * Register a new theatre (Owner API)
   * Derives ownership strictly from the authenticated tenant context.
   */
  static async registerTheatre(theatreInput, userContext) {
    if (!userContext || !userContext.id) {
      throw new AuthorizationError('Authentication required to register theatre');
    }

    if (!userContext.partnerId) {
      throw new AuthorizationError(
        'User is not associated with an approved theatre partner organization',
        ErrorCodes.TENANT_ACCESS_DENIED
      );
    }

    // 1. Validate City Reference
    const city = await TheatreRepository.findCityById(theatreInput.address.cityId);
    if (!city || !city.isActive) {
      throw new ValidationError(
        'The specified city does not exist or is currently inactive',
        ErrorCodes.CITY_NOT_FOUND
      );
    }

    // 2. Validate GeoJSON Coordinates
    if (!validateCoordinates(theatreInput.location.coordinates)) {
      throw new ValidationError(
        'Invalid coordinates format. Longitude must be between -180 and 180, Latitude between -90 and 90.'
      );
    }

    // 3. Validate Theatre Code Uniqueness within Partner Scope
    if (theatreInput.theatreCode) {
      const codeTaken = await TheatreRepository.isCodeTaken(
        theatreInput.theatreCode,
        userContext.partnerId
      );
      if (codeTaken) {
        throw new ConflictError(
          `Theatre code '${theatreInput.theatreCode}' is already registered under your organization`,
          ErrorCodes.DUPLICATE_RESOURCE
        );
      }
    }

    // 4. Generate Unique URL Slug
    const slug = await generateUniqueTheatreSlug(theatreInput.name, city.name, Theatre);

    // 5. Construct Theatre Document with strict security boundaries
    const theatrePayload = {
      ...theatreInput,
      partnerId: userContext.partnerId,
      slug,
      status: TheatreStatus.PENDING_APPROVAL,
      address: {
        ...theatreInput.address,
        cityName: city.name
      },
      createdBy: userContext.id,
      isActive: true,
      isDeleted: false,
      isSuspended: false,
      approvedBy: null,
      approvedAt: null
    };

    const newTheatre = await TheatreRepository.create(theatrePayload);

    // 6. Record Audit Log
    await AuthRepository.createAuditLog({
      action: 'THEATRE_REGISTERED',
      userId: userContext.id,
      details: {
        theatreId: newTheatre._id,
        theatreName: newTheatre.name,
        partnerId: userContext.partnerId,
        slug
      }
    }).catch(() => {});

    return newTheatre;
  }

  /**
   * List theatres owned by the authenticated partner
   */
  static async getMyTheatres(query, userContext) {
    if (!userContext.partnerId) {
      throw new AuthorizationError(
        'User is not associated with a theatre partner',
        ErrorCodes.TENANT_ACCESS_DENIED
      );
    }

    const {
      page = 1,
      limit = 20,
      search,
      status,
      cityId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (cityId) {
      filter['address.cityId'] = cityId;
    }
    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const { theatres, total } = await TheatreRepository.findOwnerTheatres({
      partnerId: userContext.partnerId,
      filter,
      skip,
      limit,
      sort
    });

    return {
      theatres,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get single theatre by ID with strict owner verification
   */
  static async getTheatreByIdForOwner(theatreId, userContext) {
    if (!userContext.partnerId) {
      throw new AuthorizationError(
        'User is not associated with a theatre partner',
        ErrorCodes.TENANT_ACCESS_DENIED
      );
    }

    const theatre = await TheatreRepository.findByIdAndPartnerId(theatreId, userContext.partnerId);
    if (!theatre) {
      throw new NotFoundError(
        `Theatre not found with ID '${theatreId}' under your organization`,
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }

    return theatre;
  }

  /**
   * Update theatre details with owner verification
   */
  static async updateTheatre(theatreId, updateData, userContext) {
    const existing = await TheatreRepository.findByIdAndPartnerId(theatreId, userContext.partnerId);
    if (!existing) {
      throw new NotFoundError(
        `Theatre not found with ID '${theatreId}' under your organization`,
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }

    // Check code collision if modified
    if (updateData.theatreCode && updateData.theatreCode !== existing.theatreCode) {
      const codeTaken = await TheatreRepository.isCodeTaken(
        updateData.theatreCode,
        userContext.partnerId,
        theatreId
      );
      if (codeTaken) {
        throw new ConflictError(
          `Theatre code '${updateData.theatreCode}' is already registered under your organization`,
          ErrorCodes.DUPLICATE_RESOURCE
        );
      }
    }

    // Validate city if cityId changed
    if (updateData.address && updateData.address.cityId) {
      const city = await TheatreRepository.findCityById(updateData.address.cityId);
      if (!city || !city.isActive) {
        throw new ValidationError(
          'Specified city does not exist or is inactive',
          ErrorCodes.CITY_NOT_FOUND
        );
      }
      updateData.address.cityName = city.name;
    }

    // Validate coordinates if updated
    if (updateData.location && updateData.location.coordinates) {
      if (!validateCoordinates(updateData.location.coordinates)) {
        throw new ValidationError('Invalid location coordinates');
      }
    }

    // Regenerate slug if name changed
    if (updateData.name && updateData.name !== existing.name) {
      const cityName = existing.address?.cityName || '';
      updateData.slug = await generateUniqueTheatreSlug(updateData.name, cityName, Theatre);
    }

    // Prevent mass-assignment of protected attributes
    delete updateData.partnerId;
    delete updateData.status;
    delete updateData.isDeleted;
    delete updateData.deletedAt;
    delete updateData.approvedBy;
    delete updateData.approvedAt;
    delete updateData.isSuspended;

    const updated = await TheatreRepository.updateWithPartner(
      theatreId,
      userContext.partnerId,
      updateData
    );

    await AuthRepository.createAuditLog({
      action: 'THEATRE_UPDATED',
      userId: userContext.id,
      details: { theatreId, changes: Object.keys(updateData) }
    }).catch(() => {});

    return updated;
  }

  /**
   * Update theatre operational hours and amenities
   */
  static async updateTheatreOperations(theatreId, opsData, userContext) {
    const existing = await TheatreRepository.findByIdAndPartnerId(theatreId, userContext.partnerId);
    if (!existing) {
      throw new NotFoundError(
        'Theatre not found under your organization',
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }

    const updatePayload = {};
    if (opsData.operatingHours) {
      updatePayload.operatingHours = opsData.operatingHours;
    }
    if (opsData.amenities) {
      updatePayload.amenities = opsData.amenities;
    }

    const updated = await TheatreRepository.updateWithPartner(
      theatreId,
      userContext.partnerId,
      updatePayload
    );

    await AuthRepository.createAuditLog({
      action: 'THEATRE_OPERATIONS_UPDATED',
      userId: userContext.id,
      details: { theatreId }
    }).catch(() => {});

    return updated;
  }

  /**
   * Update theatre media assets
   */
  static async updateTheatreMedia(theatreId, mediaData, userContext) {
    const existing = await TheatreRepository.findByIdAndPartnerId(theatreId, userContext.partnerId);
    if (!existing) {
      throw new NotFoundError(
        'Theatre not found under your organization',
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }

    const updatedMedia = {
      ...existing.media.toObject(),
      ...mediaData
    };

    const updated = await TheatreRepository.updateWithPartner(theatreId, userContext.partnerId, {
      media: updatedMedia
    });

    return updated;
  }

  /**
   * Soft delete theatre
   */
  static async softDeleteTheatre(theatreId, userContext) {
    const existing = await TheatreRepository.findByIdAndPartnerId(theatreId, userContext.partnerId);
    if (!existing) {
      throw new NotFoundError(
        'Theatre not found under your organization',
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }

    // In a downstream production environment, verify zero active screens or future shows
    if (existing.totalScreens > 0) {
      // Guard: Safe deactivation rather than destruction if screens are configured
      throw new ConflictError(
        'Cannot delete theatre because active screens or auditoriums are configured. Please deactivate the theatre instead.',
        ErrorCodes.RESOURCE_IN_USE
      );
    }

    const deleted = await TheatreRepository.softDeleteWithPartner(theatreId, userContext.partnerId);

    await AuthRepository.createAuditLog({
      action: 'THEATRE_DELETED',
      userId: userContext.id,
      details: { theatreId, theatreName: existing.name }
    }).catch(() => {});

    return deleted;
  }

  /* =========================================================================
   * 2. SUPER ADMIN OPERATIONS
   * ========================================================================= */

  /**
   * List all theatres across the platform for administrators
   */
  static async getAllTheatresAdmin(query) {
    const {
      page = 1,
      limit = 20,
      search,
      partnerId,
      status,
      cityId,
      state,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const filter = {};
    if (partnerId) {
      filter.partnerId = partnerId;
    }
    if (status) {
      filter.status = status;
    }
    if (cityId) {
      filter['address.cityId'] = cityId;
    }
    if (state) {
      filter['address.state'] = { $regex: state.trim(), $options: 'i' };
    }
    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const { theatres, total } = await TheatreRepository.findAdminTheatres({
      filter,
      skip,
      limit,
      sort
    });

    return {
      theatres,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get single theatre by ID for admin
   */
  static async getTheatreByIdAdmin(theatreId) {
    const theatre = await TheatreRepository.findById(theatreId);
    if (!theatre) {
      throw new NotFoundError(
        `Theatre not found with ID '${theatreId}'`,
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }
    return theatre;
  }

  /**
   * Approve a pending theatre
   */
  static async approveTheatre(theatreId, adminContext) {
    const theatre = await TheatreRepository.findById(theatreId);
    if (!theatre) {
      throw new NotFoundError('Theatre not found', ErrorCodes.THEATRE_NOT_FOUND);
    }

    if (!isAllowedTheatreStatusTransition(theatre.status, TheatreStatus.APPROVED)) {
      throw new ValidationError(
        `Cannot transition theatre from status '${theatre.status}' to 'APPROVED'`,
        ErrorCodes.INVALID_STATUS_TRANSITION
      );
    }

    const updated = await TheatreRepository.update(theatreId, {
      status: TheatreStatus.APPROVED,
      approvedBy: adminContext.id,
      approvedAt: new Date(),
      rejectionReason: '',
      isActive: true,
      isSuspended: false
    });

    await AuthRepository.createAuditLog({
      action: 'THEATRE_APPROVED',
      userId: adminContext.id,
      details: { theatreId, theatreName: theatre.name, previousStatus: theatre.status }
    }).catch(() => {});

    return updated;
  }

  /**
   * Reject a pending theatre
   */
  static async rejectTheatre(theatreId, rejectionReason, adminContext) {
    const theatre = await TheatreRepository.findById(theatreId);
    if (!theatre) {
      throw new NotFoundError('Theatre not found', ErrorCodes.THEATRE_NOT_FOUND);
    }

    if (!isAllowedTheatreStatusTransition(theatre.status, TheatreStatus.REJECTED)) {
      throw new ValidationError(
        `Cannot transition theatre from status '${theatre.status}' to 'REJECTED'`,
        ErrorCodes.INVALID_STATUS_TRANSITION
      );
    }

    const updated = await TheatreRepository.update(theatreId, {
      status: TheatreStatus.REJECTED,
      rejectionReason,
      isActive: false
    });

    await AuthRepository.createAuditLog({
      action: 'THEATRE_REJECTED',
      userId: adminContext.id,
      details: { theatreId, rejectionReason }
    }).catch(() => {});

    return updated;
  }

  /**
   * Suspend an active theatre
   */
  static async suspendTheatre(theatreId, adminContext) {
    const theatre = await TheatreRepository.findById(theatreId);
    if (!theatre) {
      throw new NotFoundError('Theatre not found', ErrorCodes.THEATRE_NOT_FOUND);
    }

    if (!isAllowedTheatreStatusTransition(theatre.status, TheatreStatus.SUSPENDED)) {
      throw new ValidationError(
        `Cannot transition theatre from status '${theatre.status}' to 'SUSPENDED'`,
        ErrorCodes.INVALID_STATUS_TRANSITION
      );
    }

    const updated = await TheatreRepository.update(theatreId, {
      status: TheatreStatus.SUSPENDED,
      isSuspended: true,
      isActive: false
    });

    await AuthRepository.createAuditLog({
      action: 'THEATRE_SUSPENDED',
      userId: adminContext.id,
      details: { theatreId }
    }).catch(() => {});

    return updated;
  }

  /**
   * Reactivate a suspended theatre
   */
  static async reactivateTheatre(theatreId, adminContext) {
    const theatre = await TheatreRepository.findById(theatreId);
    if (!theatre) {
      throw new NotFoundError('Theatre not found', ErrorCodes.THEATRE_NOT_FOUND);
    }

    if (!isAllowedTheatreStatusTransition(theatre.status, TheatreStatus.APPROVED)) {
      throw new ValidationError(
        `Cannot reactivate theatre from status '${theatre.status}'`,
        ErrorCodes.INVALID_STATUS_TRANSITION
      );
    }

    const updated = await TheatreRepository.update(theatreId, {
      status: TheatreStatus.APPROVED,
      isSuspended: false,
      isActive: true
    });

    await AuthRepository.createAuditLog({
      action: 'THEATRE_REACTIVATED',
      userId: adminContext.id,
      details: { theatreId }
    }).catch(() => {});

    return updated;
  }

  /**
   * Update administrative properties of a theatre
   */
  static async updateTheatreAdmin(theatreId, updateData, adminContext) {
    const theatre = await TheatreRepository.findById(theatreId);
    if (!theatre) {
      throw new NotFoundError('Theatre not found', ErrorCodes.THEATRE_NOT_FOUND);
    }

    const updated = await TheatreRepository.update(theatreId, updateData);

    await AuthRepository.createAuditLog({
      action: 'THEATRE_ADMIN_UPDATED',
      userId: adminContext.id,
      details: { theatreId, changes: Object.keys(updateData) }
    }).catch(() => {});

    return updated;
  }

  /* =========================================================================
   * 3. PUBLIC THEATRE DISCOVERY
   * ========================================================================= */

  /**
   * Query public theatres with filters and geospatial proximity
   */
  static async getPublicTheatres(query) {
    const {
      page = 1,
      limit = 20,
      search,
      cityId,
      citySlug,
      area,
      pincode,
      facilities,
      longitude,
      latitude,
      radiusKm = 15,
      sortBy = 'name',
      sortOrder = 'asc'
    } = query;

    const filter = {};

    // 1. Resolve City Filter
    if (cityId) {
      filter['address.cityId'] = cityId;
    } else if (citySlug) {
      const city = await TheatreRepository.findCityBySlug(citySlug);
      if (city) {
        filter['address.cityId'] = city._id;
      }
    }

    // 2. Text / Area / Pincode Filters
    if (area) {
      filter['address.area'] = { $regex: area.trim(), $options: 'i' };
    }
    if (pincode) {
      filter['address.pincode'] = pincode.trim();
    }
    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { 'address.area': { $regex: search.trim(), $options: 'i' } },
        { 'address.street': { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // 3. Amenities Filter
    if (facilities) {
      const amenityList = facilities.split(',').map(f => f.trim().toUpperCase());
      filter.amenities = { $all: amenityList };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    let coordinates = null;
    let maxDistanceMeters = null;

    if (typeof longitude === 'number' && typeof latitude === 'number') {
      coordinates = [longitude, latitude];
      maxDistanceMeters = radiusKm * 1000;
    }

    const { theatres, total } = await TheatreRepository.findPublicTheatres({
      filter,
      coordinates,
      maxDistanceMeters,
      skip,
      limit,
      sort
    });

    return {
      theatres,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get single public theatre by slug
   */
  static async getPublicTheatreBySlug(slug) {
    const theatre = await TheatreRepository.findPublicBySlug(slug);
    if (!theatre) {
      throw new NotFoundError(
        `Theatre not found with slug '${slug}'`,
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }
    return theatre;
  }

  /**
   * Get single public theatre by ID
   */
  static async getPublicTheatreById(theatreId) {
    const theatre = await TheatreRepository.findPublicById(theatreId);
    if (!theatre) {
      throw new NotFoundError(
        `Theatre not found with ID '${theatreId}'`,
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }
    return theatre;
  }

  /* =========================================================================
   * 4. THEATRE STAFF & MANAGER ASSIGNMENT
   * ========================================================================= */

  /**
   * Assign an existing authorized user as manager or staff to a theatre
   */
  static async assignStaff(theatreId, { userId, role }, userContext) {
    // 1. Verify theatre ownership
    const theatre = await TheatreRepository.findByIdAndPartnerId(theatreId, userContext.partnerId);
    if (!theatre) {
      throw new NotFoundError(
        'Theatre not found under your organization',
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }

    // 2. Validate Target User
    const targetUser = await User.findById(userId);
    if (!targetUser || !targetUser.isActive || targetUser.deletedAt) {
      throw new NotFoundError('Target user account not found or is inactive', ErrorCodes.NOT_FOUND);
    }

    // Guard: Owner cannot assign or modify Super Admin
    if (targetUser.role === Roles.SUPER_ADMIN) {
      throw new AuthorizationError(
        'Cannot assign or modify Super Admin privileges',
        ErrorCodes.FORBIDDEN
      );
    }

    // Guard: User must not belong to another partner
    if (targetUser.partnerId && String(targetUser.partnerId) !== String(userContext.partnerId)) {
      throw new ConflictError(
        'User is already affiliated with another cinema organization',
        ErrorCodes.CONFLICT
      );
    }

    // 3. Assign Role and Associate Theatre
    targetUser.role = role;
    targetUser.partnerId = userContext.partnerId;

    if (!targetUser.assignedTheatres.some(id => String(id) === String(theatreId))) {
      targetUser.assignedTheatres.push(theatreId);
    }

    await targetUser.save();

    await AuthRepository.createAuditLog({
      action: 'STAFF_ASSIGNED',
      userId: userContext.id,
      details: {
        theatreId,
        assignedUserId: userId,
        assignedRole: role,
        partnerId: userContext.partnerId
      }
    }).catch(() => {});

    return {
      userId: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      assignedTheatres: targetUser.assignedTheatres
    };
  }

  /**
   * List staff assigned to a theatre
   */
  static async getTheatreStaff(theatreId, userContext) {
    const theatre = await TheatreRepository.findByIdAndPartnerId(theatreId, userContext.partnerId);
    if (!theatre) {
      throw new NotFoundError(
        'Theatre not found under your organization',
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }

    const staffMembers = await User.find({
      partnerId: userContext.partnerId,
      assignedTheatres: theatreId,
      isActive: true,
      deletedAt: null
    })
      .select('name email phone role assignedTheatres createdAt lastLoginAt')
      .lean();

    return staffMembers;
  }

  /**
   * Remove a staff assignment from a theatre
   */
  static async removeStaff(theatreId, userId, userContext) {
    const theatre = await TheatreRepository.findByIdAndPartnerId(theatreId, userContext.partnerId);
    if (!theatre) {
      throw new NotFoundError(
        'Theatre not found under your organization',
        ErrorCodes.THEATRE_NOT_FOUND
      );
    }

    const targetUser = await User.findOne({
      _id: userId,
      partnerId: userContext.partnerId
    });

    if (!targetUser) {
      throw new NotFoundError('Staff user not found in your organization', ErrorCodes.NOT_FOUND);
    }

    // Remove theatreId from array
    targetUser.assignedTheatres = targetUser.assignedTheatres.filter(
      id => String(id) !== String(theatreId)
    );

    // If user has no more assigned theatres, revert to CUSTOMER role and unbind partner
    if (targetUser.assignedTheatres.length === 0) {
      targetUser.role = Roles.CUSTOMER;
      targetUser.partnerId = null;
    }

    await targetUser.save();

    await AuthRepository.createAuditLog({
      action: 'STAFF_REMOVED',
      userId: userContext.id,
      details: {
        theatreId,
        removedUserId: userId,
        partnerId: userContext.partnerId
      }
    }).catch(() => {});

    return { success: true, message: 'Staff member assignment removed successfully' };
  }

  /* =========================================================================
   * 5. CITY MASTER DATA OPERATIONS
   * ========================================================================= */

  static async getActiveCities() {
    return TheatreRepository.findActiveCities();
  }

  static async createCity(cityData) {
    const existing = await TheatreRepository.findCityBySlug(cityData.slug);
    if (existing) {
      throw new ConflictError(
        `City with slug '${cityData.slug}' already exists`,
        ErrorCodes.DUPLICATE_RESOURCE
      );
    }
    return TheatreRepository.createCity(cityData);
  }
}

export default TheatreService;
