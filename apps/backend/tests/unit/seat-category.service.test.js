import { jest } from '@jest/globals';
import SeatCategoryService from '../../src/modules/screens/seat-category/seat-category.service.js';
import SeatCategoryRepository from '../../src/modules/screens/seat-category/seat-category.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { NotFoundError } from '../../src/common/errors/not-found.error.js';
import { ConflictError } from '../../src/common/errors/conflict.error.js';
import { AuthorizationError } from '../../src/common/errors/authorization.error.js';

describe('SeatCategoryService Unit Tests', () => {
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockOtherPartnerId = '65f1a2b3c4d5e6f7a8b9c0b2';
  const mockCategoryId = '65f1a2b3c4d5e6f7a8b9c0c1';

  const mockUserContext = {
    id: 'user-1',
    role: Roles.THEATRE_OWNER,
    partnerId: mockPartnerId
  };

  const mockAdminContext = {
    id: 'admin-1',
    role: Roles.SYSTEM_ADMIN,
    partnerId: null
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createCategory', () => {
    it('should create a custom category for the partner organization', async () => {
      jest.spyOn(SeatCategoryRepository, 'findExactByPartnerAndCode').mockResolvedValue(null);
      jest.spyOn(SeatCategoryRepository, 'create').mockImplementation(data =>
        Promise.resolve({
          _id: mockCategoryId,
          ...data
        })
      );

      const category = await SeatCategoryService.createCategory(
        {
          name: 'VIP Recliner Lux',
          code: 'VIP_RECLINER',
          basePrice: 500,
          displayColor: '#7C3AED'
        },
        mockUserContext
      );

      expect(category).toBeDefined();
      expect(category.code).toBe('VIP_RECLINER');
      expect(category.partnerId).toBe(mockPartnerId);
    });

    it('should throw ConflictError if code is already registered by partner', async () => {
      jest.spyOn(SeatCategoryRepository, 'findExactByPartnerAndCode').mockResolvedValue({
        _id: 'existing-id',
        code: 'VIP_RECLINER'
      });

      await expect(
        SeatCategoryService.createCategory(
          { name: 'VIP Recliner', code: 'VIP_RECLINER' },
          mockUserContext
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getCategoriesForPartner', () => {
    it('should fetch categories available for partner', async () => {
      jest.spyOn(SeatCategoryRepository, 'findAllForPartner').mockResolvedValue([
        { code: 'REGULAR', basePrice: 150 },
        { code: 'VIP_RECLINER', basePrice: 450 }
      ]);

      const categories = await SeatCategoryService.getCategoriesForPartner(mockPartnerId);
      expect(categories).toHaveLength(2);
    });
  });

  describe('getCategoryById', () => {
    it('should return category when owned by partner', async () => {
      jest.spyOn(SeatCategoryRepository, 'findById').mockResolvedValue({
        _id: mockCategoryId,
        partnerId: mockPartnerId,
        code: 'VIP_RECLINER'
      });

      const cat = await SeatCategoryService.getCategoryById(
        mockCategoryId,
        mockPartnerId,
        Roles.THEATRE_OWNER
      );
      expect(cat).toBeDefined();
    });

    it('should throw NotFoundError if category belongs to another partner', async () => {
      jest.spyOn(SeatCategoryRepository, 'findById').mockResolvedValue({
        _id: mockCategoryId,
        partnerId: mockOtherPartnerId,
        code: 'VIP_RECLINER'
      });

      await expect(
        SeatCategoryService.getCategoryById(mockCategoryId, mockPartnerId, Roles.THEATRE_OWNER)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateCategory', () => {
    it('should allow system admin to update platform default category', async () => {
      jest.spyOn(SeatCategoryRepository, 'findById').mockResolvedValue({
        _id: mockCategoryId,
        partnerId: null,
        code: 'REGULAR'
      });
      jest.spyOn(SeatCategoryRepository, 'updateById').mockResolvedValue({
        _id: mockCategoryId,
        name: 'Regular Standard Tier',
        basePrice: 180
      });

      const updated = await SeatCategoryService.updateCategory(
        mockCategoryId,
        { name: 'Regular Standard Tier', basePrice: 180 },
        mockAdminContext
      );

      expect(updated.name).toBe('Regular Standard Tier');
      expect(updated.basePrice).toBe(180);
    });

    it('should prevent non-admin from updating platform-wide defaults', async () => {
      jest.spyOn(SeatCategoryRepository, 'findById').mockResolvedValue({
        _id: mockCategoryId,
        partnerId: null, // Global default
        code: 'REGULAR'
      });

      await expect(
        SeatCategoryService.updateCategory(mockCategoryId, { basePrice: 999 }, mockUserContext)
      ).rejects.toThrow(AuthorizationError);
    });

    it('should allow partner to update their own category', async () => {
      jest.spyOn(SeatCategoryRepository, 'findById').mockResolvedValue({
        _id: mockCategoryId,
        partnerId: mockPartnerId,
        code: 'VIP_RECLINER'
      });
      jest.spyOn(SeatCategoryRepository, 'updateById').mockResolvedValue({
        _id: mockCategoryId,
        name: 'VIP Recliner Gold',
        basePrice: 550
      });

      const updated = await SeatCategoryService.updateCategory(
        mockCategoryId,
        { name: 'VIP Recliner Gold', basePrice: 550 },
        mockUserContext
      );

      expect(updated.name).toBe('VIP Recliner Gold');
      expect(updated.basePrice).toBe(550);
    });
  });

  describe('deleteCategory', () => {
    it('should allow partner to delete their category', async () => {
      jest.spyOn(SeatCategoryRepository, 'findById').mockResolvedValue({
        _id: mockCategoryId,
        partnerId: mockPartnerId,
        code: 'VIP_RECLINER'
      });
      jest.spyOn(SeatCategoryRepository, 'softDelete').mockResolvedValue({
        _id: mockCategoryId,
        deletedAt: new Date()
      });

      const result = await SeatCategoryService.deleteCategory(mockCategoryId, mockUserContext);
      expect(result.success).toBe(true);
    });

    it('should prevent partner from deleting platform default category', async () => {
      jest.spyOn(SeatCategoryRepository, 'findById').mockResolvedValue({
        _id: mockCategoryId,
        partnerId: null,
        code: 'REGULAR'
      });

      await expect(
        SeatCategoryService.deleteCategory(mockCategoryId, mockUserContext)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('seedDefaults', () => {
    it('should create default categories when not already present', async () => {
      jest.spyOn(SeatCategoryRepository, 'findByCode').mockResolvedValue(null);
      const createSpy = jest.spyOn(SeatCategoryRepository, 'create').mockResolvedValue({});

      await SeatCategoryService.seedDefaults();
      expect(createSpy).toHaveBeenCalled();
    });
  });
});
