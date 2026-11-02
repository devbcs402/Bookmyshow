import { jest } from '@jest/globals';
import ShowPricingService from '../../src/modules/shows/show-pricing/show-pricing.service.js';
import ShowPricingRepository from '../../src/modules/shows/show-pricing/show-pricing.repository.js';
import ShowRepository from '../../src/modules/shows/show.repository.js';
import SeatingLayoutRepository from '../../src/modules/screens/seating-layout/seating-layout.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { ValidationError } from '../../src/common/errors/validation.error.js';
import { NotFoundError } from '../../src/common/errors/not-found.error.js';

describe('ShowPricingService Unit Tests', () => {
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockShowId = '65f1a2b3c4d5e6f7a8b9c0s1';
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c0e1';
  const mockLayoutId = '65f1a2b3c4d5e6f7a8b9c0l1';

  const mockUserContext = {
    id: 'user-1',
    role: Roles.THEATRE_OWNER,
    partnerId: mockPartnerId
  };

  const sampleShow = {
    _id: mockShowId,
    screenId: mockScreenId,
    partnerId: mockPartnerId,
    layoutId: mockLayoutId,
    pricingTiers: []
  };

  const sampleLayout = {
    _id: mockLayoutId,
    categoryBreakdown: [{ categoryCode: 'REGULAR' }, { categoryCode: 'PREMIUM' }]
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setShowPricing', () => {
    it('should configure pricing tiers for valid layout categories', async () => {
      jest.spyOn(ShowRepository, 'findById').mockResolvedValue(sampleShow);
      jest.spyOn(SeatingLayoutRepository, 'findById').mockResolvedValue(sampleLayout);
      jest
        .spyOn(ShowPricingRepository, 'upsertTier')
        .mockImplementation(data => Promise.resolve(data));
      jest.spyOn(ShowRepository, 'updateById').mockResolvedValue({
        ...sampleShow,
        pricingTiers: [
          { categoryCode: 'REGULAR', basePrice: 150, effectivePrice: 177 },
          { categoryCode: 'PREMIUM', basePrice: 250, effectivePrice: 295 }
        ]
      });

      const result = await ShowPricingService.setShowPricing(
        mockShowId,
        [
          { categoryCode: 'REGULAR', basePrice: 150 },
          { categoryCode: 'PREMIUM', basePrice: 250 }
        ],
        mockUserContext
      );

      expect(result.pricingTiers).toHaveLength(2);
      expect(ShowPricingRepository.upsertTier).toHaveBeenCalledTimes(2);
    });

    it('should reject category code that does not exist in the screen layout', async () => {
      jest.spyOn(ShowRepository, 'findById').mockResolvedValue(sampleShow);
      jest.spyOn(SeatingLayoutRepository, 'findById').mockResolvedValue(sampleLayout);

      await expect(
        ShowPricingService.setShowPricing(
          mockShowId,
          [{ categoryCode: 'NON_EXISTENT_TIER', basePrice: 500 }],
          mockUserContext
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should reject negative base price', async () => {
      jest.spyOn(ShowRepository, 'findById').mockResolvedValue(sampleShow);
      jest.spyOn(SeatingLayoutRepository, 'findById').mockResolvedValue(sampleLayout);

      await expect(
        ShowPricingService.setShowPricing(
          mockShowId,
          [{ categoryCode: 'REGULAR', basePrice: -50 }],
          mockUserContext
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getShowPricing', () => {
    it('should retrieve pricing tiers for a show', async () => {
      jest.spyOn(ShowRepository, 'findById').mockResolvedValue(sampleShow);
      jest
        .spyOn(ShowPricingRepository, 'findByShowId')
        .mockResolvedValue([{ categoryCode: 'REGULAR', basePrice: 150, effectivePrice: 177 }]);

      const tiers = await ShowPricingService.getShowPricing(mockShowId, mockUserContext);
      expect(tiers).toHaveLength(1);
    });
  });

  describe('updateCategoryPrice', () => {
    it('should update price for specific category', async () => {
      jest.spyOn(ShowRepository, 'findById').mockResolvedValue({
        ...sampleShow,
        pricingTiers: [
          {
            categoryCode: 'REGULAR',
            basePrice: 150,
            effectivePrice: 177,
            toObject: () => ({ categoryCode: 'REGULAR', basePrice: 150, effectivePrice: 177 })
          }
        ]
      });
      jest.spyOn(ShowPricingRepository, 'findByShowAndCategory').mockResolvedValue({
        categoryCode: 'REGULAR',
        basePrice: 150,
        convenienceFee: 0,
        taxPercent: 18.0
      });
      jest.spyOn(ShowPricingRepository, 'upsertTier').mockResolvedValue({
        categoryCode: 'REGULAR',
        basePrice: 200,
        effectivePrice: 236
      });
      jest.spyOn(ShowRepository, 'updateById').mockResolvedValue({});

      const updated = await ShowPricingService.updateCategoryPrice(
        mockShowId,
        'REGULAR',
        { basePrice: 200 },
        mockUserContext
      );

      expect(updated.basePrice).toBe(200);
      expect(updated.effectivePrice).toBe(236);
    });

    it('should throw NotFoundError if category pricing does not exist on show', async () => {
      jest.spyOn(ShowRepository, 'findById').mockResolvedValue(sampleShow);
      jest.spyOn(ShowPricingRepository, 'findByShowAndCategory').mockResolvedValue(null);

      await expect(
        ShowPricingService.updateCategoryPrice(
          mockShowId,
          'VIP_BED',
          { basePrice: 900 },
          mockUserContext
        )
      ).rejects.toThrow(NotFoundError);
    });
  });
});
