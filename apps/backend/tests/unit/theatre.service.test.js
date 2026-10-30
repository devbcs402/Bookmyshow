import { jest } from '@jest/globals';
import TheatreService from '../../src/modules/theatres/theatre.service.js';
import TheatreRepository from '../../src/modules/theatres/theatre.repository.js';
import Theatre from '../../src/modules/theatres/model/theatre.model.js';
import User from '../../src/modules/users/model/user.model.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { TheatreStatus } from '../../src/modules/theatres/theatre.constants.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';

describe('TheatreService Unit Tests', () => {
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockUserId = '65f1a2b3c4d5e6f7a8b9c0u1';
  const mockCityId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const mockTheatreId = '65f1a2b3c4d5e6f7a8b9c0t1';

  const validTheatreInput = {
    name: 'PVR ICON: Phoenix Palladium',
    theatreCode: 'PVR-MUM-01',
    description: 'Premier multiplex in South Mumbai',
    contactEmail: 'icon.palladium@pvr.com',
    contactPhone: '+912224989100',
    address: {
      street: '462, Senapati Bapat Marg',
      area: 'Lower Parel',
      cityId: mockCityId,
      state: 'Maharashtra',
      country: 'India',
      pincode: '400013'
    },
    location: {
      type: 'Point',
      coordinates: [72.8258, 18.9953]
    },
    amenities: ['PARKING', 'FOOD_BEVERAGES', 'DOLBY_ATMOS', 'IMAX']
  };

  const mockUserContext = {
    id: mockUserId,
    email: 'owner@pvr.com',
    role: Roles.THEATRE_OWNER,
    partnerId: mockPartnerId
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerTheatre', () => {
    it('should successfully register a theatre with PENDING_APPROVAL status and correct tenant partnerId', async () => {
      jest.spyOn(TheatreRepository, 'findCityById').mockResolvedValue({
        _id: mockCityId,
        name: 'Mumbai',
        isActive: true
      });
      jest.spyOn(TheatreRepository, 'isCodeTaken').mockResolvedValue(false);
      jest.spyOn(Theatre, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });
      jest
        .spyOn(TheatreRepository, 'create')
        .mockImplementation(data => Promise.resolve({ _id: mockTheatreId, ...data }));
      jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});

      const result = await TheatreService.registerTheatre(validTheatreInput, mockUserContext);

      expect(result).toBeDefined();
      expect(result.partnerId).toBe(mockPartnerId);
      expect(result.status).toBe(TheatreStatus.PENDING_APPROVAL);
      expect(result.createdBy).toBe(mockUserId);
      expect(result.slug).toContain('pvr-icon-phoenix-palladium');
    });

    it('should throw AuthorizationError if user has no partnerId context', async () => {
      await expect(
        TheatreService.registerTheatre(validTheatreInput, {
          id: mockUserId,
          role: Roles.CUSTOMER,
          partnerId: null
        })
      ).rejects.toThrow('User is not associated with an approved theatre partner organization');
    });

    it('should throw ValidationError if city is inactive or not found', async () => {
      jest.spyOn(TheatreRepository, 'findCityById').mockResolvedValue(null);

      await expect(
        TheatreService.registerTheatre(validTheatreInput, mockUserContext)
      ).rejects.toThrow('The specified city does not exist or is currently inactive');
    });

    it('should throw ValidationError on invalid coordinates', async () => {
      jest.spyOn(TheatreRepository, 'findCityById').mockResolvedValue({
        _id: mockCityId,
        name: 'Mumbai',
        isActive: true
      });

      const invalidCoordInput = {
        ...validTheatreInput,
        location: { type: 'Point', coordinates: [200, 95] } // Out of bounds
      };

      await expect(
        TheatreService.registerTheatre(invalidCoordInput, mockUserContext)
      ).rejects.toThrow('Invalid coordinates format');
    });

    it('should throw ConflictError if theatreCode is already registered under the same partner', async () => {
      jest.spyOn(TheatreRepository, 'findCityById').mockResolvedValue({
        _id: mockCityId,
        name: 'Mumbai',
        isActive: true
      });
      jest.spyOn(TheatreRepository, 'isCodeTaken').mockResolvedValue(true);

      await expect(
        TheatreService.registerTheatre(validTheatreInput, mockUserContext)
      ).rejects.toThrow(/already registered under your organization/);
    });
  });

  describe('getMyTheatres', () => {
    it('should return paginated theatres strictly matching partnerId', async () => {
      const mockTheatres = [{ _id: mockTheatreId, name: 'PVR ICON' }];
      jest.spyOn(TheatreRepository, 'findOwnerTheatres').mockResolvedValue({
        theatres: mockTheatres,
        total: 1
      });

      const result = await TheatreService.getMyTheatres({ page: 1, limit: 10 }, mockUserContext);

      expect(result.theatres).toEqual(mockTheatres);
      expect(result.pagination.totalRecords).toBe(1);
    });
  });

  describe('getTheatreByIdForOwner', () => {
    it('should return theatre when owned by partner', async () => {
      const mockTheatre = { _id: mockTheatreId, partnerId: mockPartnerId, name: 'PVR ICON' };
      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(mockTheatre);

      const result = await TheatreService.getTheatreByIdForOwner(mockTheatreId, mockUserContext);
      expect(result).toEqual(mockTheatre);
    });

    it('should throw NotFoundError if theatre does not belong to partner', async () => {
      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(null);

      await expect(
        TheatreService.getTheatreByIdForOwner(mockTheatreId, mockUserContext)
      ).rejects.toThrow(/Theatre not found/);
    });
  });

  describe('updateTheatre', () => {
    it('should update allowed fields and prevent updating protected attributes', async () => {
      const existing = {
        _id: mockTheatreId,
        partnerId: mockPartnerId,
        name: 'PVR ICON',
        theatreCode: 'PVR-01',
        address: { cityName: 'Mumbai' }
      };
      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(existing);
      jest
        .spyOn(TheatreRepository, 'updateWithPartner')
        .mockImplementation((_id, _pId, data) => Promise.resolve({ ...existing, ...data }));
      jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});

      const updateData = {
        description: 'New Description',
        status: 'APPROVED', // Malicious attempt to self-approve
        partnerId: 'attacker-partner-id' // Malicious attempt to change owner
      };

      const result = await TheatreService.updateTheatre(mockTheatreId, updateData, mockUserContext);
      expect(result.description).toBe('New Description');
      expect(result.status).not.toBe('APPROVED');
      expect(result.partnerId).toBe(mockPartnerId);
    });
  });

  describe('softDeleteTheatre', () => {
    it('should soft delete theatre when no screens exist', async () => {
      const existing = {
        _id: mockTheatreId,
        partnerId: mockPartnerId,
        name: 'PVR ICON',
        totalScreens: 0
      };
      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(existing);
      jest.spyOn(TheatreRepository, 'softDeleteWithPartner').mockResolvedValue({
        ...existing,
        isDeleted: true
      });
      jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});

      const result = await TheatreService.softDeleteTheatre(mockTheatreId, mockUserContext);
      expect(result.isDeleted).toBe(true);
    });

    it('should prevent deletion if active screens are configured', async () => {
      const existing = {
        _id: mockTheatreId,
        partnerId: mockPartnerId,
        name: 'PVR ICON',
        totalScreens: 4
      };
      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(existing);

      await expect(
        TheatreService.softDeleteTheatre(mockTheatreId, mockUserContext)
      ).rejects.toThrow(/Cannot delete theatre because active screens/);
    });
  });

  describe('Admin Operations (approve, reject, suspend, reactivate)', () => {
    const adminContext = { id: 'admin-1', role: Roles.SUPER_ADMIN };

    it('should approve a PENDING_APPROVAL theatre', async () => {
      const pendingTheatre = {
        _id: mockTheatreId,
        name: 'PVR ICON',
        status: TheatreStatus.PENDING_APPROVAL
      };
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue(pendingTheatre);
      jest
        .spyOn(TheatreRepository, 'update')
        .mockImplementation((_id, data) => Promise.resolve({ ...pendingTheatre, ...data }));
      jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});

      const result = await TheatreService.approveTheatre(mockTheatreId, adminContext);
      expect(result.status).toBe(TheatreStatus.APPROVED);
      expect(result.approvedBy).toBe(adminContext.id);
    });

    it('should reject a pending theatre with rejectionReason', async () => {
      const pendingTheatre = {
        _id: mockTheatreId,
        name: 'PVR ICON',
        status: TheatreStatus.PENDING_APPROVAL
      };
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue(pendingTheatre);
      jest
        .spyOn(TheatreRepository, 'update')
        .mockImplementation((_id, data) => Promise.resolve({ ...pendingTheatre, ...data }));
      jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});

      const result = await TheatreService.rejectTheatre(
        mockTheatreId,
        'Invalid fire safety license',
        adminContext
      );
      expect(result.status).toBe(TheatreStatus.REJECTED);
      expect(result.rejectionReason).toBe('Invalid fire safety license');
    });

    it('should throw ValidationError on invalid status transition', async () => {
      const rejectedTheatre = {
        _id: mockTheatreId,
        name: 'PVR ICON',
        status: TheatreStatus.REJECTED
      };
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue(rejectedTheatre);

      await expect(TheatreService.approveTheatre(mockTheatreId, adminContext)).rejects.toThrow(
        /Cannot transition theatre/
      );
    });
  });

  describe('Staff Assignment', () => {
    it('should assign a manager to a theatre', async () => {
      const existingTheatre = { _id: mockTheatreId, partnerId: mockPartnerId };
      const targetUser = {
        _id: 'target-user-1',
        name: 'John Staff',
        email: 'staff@example.com',
        role: Roles.CUSTOMER,
        partnerId: null,
        assignedTheatres: [],
        isActive: true,
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(existingTheatre);
      jest.spyOn(User, 'findById').mockResolvedValue(targetUser);
      jest.spyOn(AuthRepository, 'createAuditLog').mockResolvedValue({});

      const result = await TheatreService.assignStaff(
        mockTheatreId,
        { userId: 'target-user-1', role: Roles.THEATRE_MANAGER },
        mockUserContext
      );

      expect(result.role).toBe(Roles.THEATRE_MANAGER);
      expect(targetUser.assignedTheatres).toContain(mockTheatreId);
    });

    it('should reject assigning Super Admin role', async () => {
      const existingTheatre = { _id: mockTheatreId, partnerId: mockPartnerId };
      const superAdminUser = {
        _id: 'admin-user-1',
        role: Roles.SUPER_ADMIN,
        isActive: true
      };

      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(existingTheatre);
      jest.spyOn(User, 'findById').mockResolvedValue(superAdminUser);

      await expect(
        TheatreService.assignStaff(
          mockTheatreId,
          { userId: 'admin-user-1', role: Roles.THEATRE_MANAGER },
          mockUserContext
        )
      ).rejects.toThrow(/Cannot assign or modify Super Admin privileges/);
    });
  });
});
