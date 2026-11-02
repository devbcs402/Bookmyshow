import { jest } from '@jest/globals';
import SeatingLayoutService from '../../src/modules/screens/seating-layout/seating-layout.service.js';
import SeatingLayoutRepository from '../../src/modules/screens/seating-layout/seating-layout.repository.js';
import ScreenRepository from '../../src/modules/screens/screen.repository.js';
import SeatRepository from '../../src/modules/screens/seat/seat.repository.js';
import SeatCategoryRepository from '../../src/modules/screens/seat-category/seat-category.repository.js';
import {
  validateLayout,
  calculateCapacity,
  generateBulkSeats
} from '../../src/modules/screens/screen.utils.js';
import { SeatStatus, SeatType, LayoutStatus } from '../../src/modules/screens/screen.constants.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { ValidationError } from '../../src/common/errors/validation.error.js';
import { NotFoundError } from '../../src/common/errors/not-found.error.js';

describe('SeatingLayout Service & Engine Unit Tests', () => {
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockTheatreId = '65f1a2b3c4d5e6f7a8b9c0t1';
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c0s1';
  const mockUserId = '65f1a2b3c4d5e6f7a8b9c0u1';

  const mockUserContext = {
    id: mockUserId,
    role: Roles.THEATRE_OWNER,
    partnerId: mockPartnerId
  };

  const sampleSeats = [
    {
      rowLabel: 'A',
      columnNumber: 1,
      seatLabel: 'A1',
      categoryCode: 'REGULAR',
      type: SeatType.NORMAL,
      status: SeatStatus.ACTIVE,
      gridRow: 0,
      gridCol: 0,
      isAvailable: true
    },
    {
      rowLabel: 'A',
      columnNumber: 2,
      seatLabel: 'A2',
      categoryCode: 'REGULAR',
      type: SeatType.NORMAL,
      status: SeatStatus.ACTIVE,
      gridRow: 0,
      gridCol: 1,
      isAvailable: true
    },
    {
      rowLabel: 'B',
      columnNumber: 1,
      seatLabel: 'B1',
      categoryCode: 'PREMIUM',
      type: SeatType.RECLINER,
      status: SeatStatus.BLOCKED,
      gridRow: 1,
      gridCol: 0,
      isAvailable: false
    }
  ];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Utility: validateLayout', () => {
    it('should validate a correct seating layout', () => {
      const result = validateLayout(sampleSeats, ['REGULAR', 'PREMIUM']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty seats array', () => {
      const result = validateLayout([]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('at least one seat');
    });

    it('should detect duplicate seat labels', () => {
      const duplicateLabelSeats = [
        ...sampleSeats,
        {
          rowLabel: 'A',
          columnNumber: 3,
          seatLabel: 'A1', // Duplicate label
          categoryCode: 'REGULAR',
          gridRow: 0,
          gridCol: 2
        }
      ];
      const result = validateLayout(duplicateLabelSeats);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate seat label'))).toBe(true);
    });

    it('should detect overlapping grid coordinates', () => {
      const overlappingSeats = [
        ...sampleSeats,
        {
          rowLabel: 'C',
          columnNumber: 1,
          seatLabel: 'C1',
          categoryCode: 'REGULAR',
          gridRow: 0, // Overlaps with A1 at (0, 0)
          gridCol: 0
        }
      ];
      const result = validateLayout(overlappingSeats);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Overlapping coordinate'))).toBe(true);
    });

    it('should detect unrecognized category codes', () => {
      const invalidCategorySeats = [
        {
          rowLabel: 'A',
          columnNumber: 1,
          seatLabel: 'A1',
          categoryCode: 'UNKNOWN_CODE',
          gridRow: 0,
          gridCol: 0
        }
      ];
      const result = validateLayout(invalidCategorySeats, ['REGULAR', 'PREMIUM']);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('unknown or inactive category code'))).toBe(true);
    });
  });

  describe('Utility: calculateCapacity', () => {
    it('should compute comprehensive capacity and breakdown stats', () => {
      const capacity = calculateCapacity(sampleSeats);

      expect(capacity.totalSeats).toBe(3);
      expect(capacity.bookableSeats).toBe(2);
      expect(capacity.activeSeats).toBe(2);
      expect(capacity.blockedSeats).toBe(1);
      expect(capacity.totalRows).toBe(2);
      expect(capacity.totalColumns).toBe(2);

      const regularBreakdown = capacity.categoryBreakdown.find(c => c.categoryCode === 'REGULAR');
      expect(regularBreakdown.count).toBe(2);
      expect(regularBreakdown.bookableCount).toBe(2);

      const premiumBreakdown = capacity.categoryBreakdown.find(c => c.categoryCode === 'PREMIUM');
      expect(premiumBreakdown.count).toBe(1);
      expect(premiumBreakdown.bookableCount).toBe(0);
    });

    it('should handle empty seats gracefully', () => {
      const capacity = calculateCapacity([]);
      expect(capacity.totalSeats).toBe(0);
      expect(capacity.bookableSeats).toBe(0);
    });
  });

  describe('Utility: generateBulkSeats', () => {
    it('should generate seat rows with aisle gaps and skipped columns', () => {
      const bulkConfig = {
        rows: [
          {
            rowLabel: 'A',
            seatCount: 6,
            categoryCode: 'EXECUTIVE',
            seatType: SeatType.NORMAL,
            aislesAfter: [3], // Aisle after seat 3
            skipColumns: [5] // Skip seat 5 (pillar)
          }
        ]
      };

      const seats = generateBulkSeats(bulkConfig);
      // 6 seats minus 1 skipped column = 5 seats generated
      expect(seats).toHaveLength(5);

      // Verify labels: A1, A2, A3, A4, A5
      expect(seats.map(s => s.seatLabel)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);

      // A1 is col 0, A2 is col 1, A3 is col 2, then aisle skips col 3, so A4 is col 4!
      const seat3 = seats.find(s => s.columnNumber === 3);
      const seat4 = seats.find(s => s.columnNumber === 4);
      expect(seat3.gridCol).toBe(2);
      expect(seat4.gridCol).toBe(4); // Aisle gap after 3 leaves gridCol 3 empty
    });
  });

  describe('SeatingLayoutService Operations', () => {
    const mockScreenDoc = {
      _id: mockScreenId,
      theatreId: mockTheatreId,
      partnerId: mockPartnerId,
      layoutVersion: 1
    };

    beforeEach(() => {
      jest.spyOn(ScreenRepository, 'findById').mockResolvedValue(mockScreenDoc);
      jest
        .spyOn(SeatCategoryRepository, 'findAllForPartner')
        .mockResolvedValue([{ code: 'REGULAR' }, { code: 'PREMIUM' }]);
    });

    it('should save a new draft layout', async () => {
      jest.spyOn(SeatingLayoutRepository, 'findDraftByScreen').mockResolvedValue(null);
      jest.spyOn(SeatingLayoutRepository, 'findLatestPublishedByScreen').mockResolvedValue(null);
      jest.spyOn(SeatingLayoutRepository, 'create').mockImplementation(data =>
        Promise.resolve({
          _id: 'layout-draft-1',
          ...data
        })
      );

      const draft = await SeatingLayoutService.saveLayoutDraft(
        mockScreenId,
        { name: 'Draft 1', seats: sampleSeats },
        mockUserContext
      );

      expect(draft).toBeDefined();
      expect(draft.status).toBe(LayoutStatus.DRAFT);
      expect(draft.totalSeats).toBe(3);
    });

    it('should throw ValidationError if draft layout has structural errors', async () => {
      const invalidSeats = [
        ...sampleSeats,
        {
          rowLabel: 'A',
          columnNumber: 3,
          seatLabel: 'A1', // duplicate label
          gridRow: 0,
          gridCol: 2
        }
      ];

      await expect(
        SeatingLayoutService.saveLayoutDraft(
          mockScreenId,
          { name: 'Bad Draft', seats: invalidSeats },
          mockUserContext
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should preview an existing layout', async () => {
      jest.spyOn(SeatingLayoutRepository, 'findDraftByScreen').mockResolvedValue({
        screenId: mockScreenId,
        layoutVersion: 1,
        status: LayoutStatus.DRAFT,
        totalRows: 2,
        totalColumns: 2,
        totalSeats: 3,
        bookableSeats: 2,
        categoryBreakdown: [],
        seats: sampleSeats
      });

      const preview = await SeatingLayoutService.previewLayout(mockScreenId, mockUserContext);
      expect(preview.totalSeats).toBe(3);
      expect(preview.status).toBe(LayoutStatus.DRAFT);
    });

    it('should publish draft layout, create physical seats, and increment screen version', async () => {
      const draftDoc = {
        _id: 'draft-layout-id',
        screenId: mockScreenId,
        theatreId: mockTheatreId,
        partnerId: mockPartnerId,
        seats: sampleSeats
      };

      jest.spyOn(SeatingLayoutRepository, 'findDraftByScreen').mockResolvedValue(draftDoc);
      jest.spyOn(SeatingLayoutRepository, 'findLatestPublishedByScreen').mockResolvedValue({
        layoutVersion: 1
      });
      jest.spyOn(SeatRepository, 'bulkInsert').mockResolvedValue(sampleSeats);
      jest.spyOn(SeatingLayoutRepository, 'deprecatePreviousPublished').mockResolvedValue(true);
      jest.spyOn(SeatingLayoutRepository, 'updateById').mockResolvedValue({
        ...draftDoc,
        status: LayoutStatus.PUBLISHED,
        layoutVersion: 2
      });
      jest.spyOn(ScreenRepository, 'updateById').mockResolvedValue({
        _id: mockScreenId,
        layoutVersion: 2,
        totalSeats: 3
      });

      const result = await SeatingLayoutService.publishLayout(mockScreenId, mockUserContext);

      expect(result.version).toBe(2);
      expect(result.totalSeats).toBe(3);
      expect(SeatRepository.bulkInsert).toHaveBeenCalled();
      expect(ScreenRepository.updateById).toHaveBeenCalled();
    });

    it('should throw NotFoundError if no draft exists to publish', async () => {
      jest.spyOn(SeatingLayoutRepository, 'findDraftByScreen').mockResolvedValue(null);

      await expect(
        SeatingLayoutService.publishLayout(mockScreenId, mockUserContext)
      ).rejects.toThrow(NotFoundError);
    });

    it('should retrieve version history', async () => {
      jest.spyOn(SeatingLayoutRepository, 'findVersionsByScreen').mockResolvedValue([
        { layoutVersion: 2, status: LayoutStatus.PUBLISHED, totalSeats: 150 },
        { layoutVersion: 1, status: LayoutStatus.DEPRECATED, totalSeats: 140 }
      ]);

      const versions = await SeatingLayoutService.getLayoutVersions(mockScreenId, mockUserContext);
      expect(versions).toHaveLength(2);
      expect(versions[0].layoutVersion).toBe(2);
    });
  });
});
