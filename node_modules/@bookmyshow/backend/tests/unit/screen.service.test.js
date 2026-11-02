import { jest } from '@jest/globals';
import ScreenService from '../../src/modules/screens/screen.service.js';
import ScreenRepository from '../../src/modules/screens/screen.repository.js';
import TheatreRepository from '../../src/modules/theatres/theatre.repository.js';
import { ScreenType, ScreenStatus } from '../../src/modules/screens/screen.constants.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { NotFoundError } from '../../src/common/errors/not-found.error.js';
import { ConflictError } from '../../src/common/errors/conflict.error.js';

describe('ScreenService Unit Tests', () => {
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockOtherPartnerId = '65f1a2b3c4d5e6f7a8b9c0b2';
  const mockUserId = '65f1a2b3c4d5e6f7a8b9c0u1';
  const mockTheatreId = '65f1a2b3c4d5e6f7a8b9c0t1';
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c0s1';

  const mockUserContext = {
    id: mockUserId,
    role: Roles.THEATRE_OWNER,
    partnerId: mockPartnerId
  };

  const mockAdminContext = {
    id: mockUserId,
    role: Roles.SYSTEM_ADMIN,
    partnerId: null
  };

  const sampleScreenInput = {
    name: 'Screen 1 - IMAX',
    screenNumber: 1,
    screenType: ScreenType.IMAX,
    supportedFormats: ['2D', '3D', 'IMAX_3D'],
    soundSystem: 'Dolby Atmos 12.1',
    description: 'IMAX laser screen'
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createScreen', () => {
    it('should successfully create a screen under a valid theatre', async () => {
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue({
        _id: mockTheatreId,
        partnerId: mockPartnerId
      });
      jest.spyOn(ScreenRepository, 'findByTheatreAndNumber').mockResolvedValue(null);
      jest.spyOn(ScreenRepository, 'create').mockImplementation(data =>
        Promise.resolve({
          _id: mockScreenId,
          ...data
        })
      );

      const screen = await ScreenService.createScreen(
        mockTheatreId,
        sampleScreenInput,
        mockUserContext
      );

      expect(screen).toBeDefined();
      expect(screen.name).toBe(sampleScreenInput.name);
      expect(screen.screenNumber).toBe(1);
      expect(screen.theatreId).toBe(mockTheatreId);
    });

    it('should throw NotFoundError if theatre does not exist', async () => {
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue(null);

      await expect(
        ScreenService.createScreen(mockTheatreId, sampleScreenInput, mockUserContext)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if theatre belongs to a different partner (BOLA protection)', async () => {
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue({
        _id: mockTheatreId,
        partnerId: mockOtherPartnerId
      });

      await expect(
        ScreenService.createScreen(mockTheatreId, sampleScreenInput, mockUserContext)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if screen number already exists in same theatre', async () => {
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue({
        _id: mockTheatreId,
        partnerId: mockPartnerId
      });
      jest.spyOn(ScreenRepository, 'findByTheatreAndNumber').mockResolvedValue({
        _id: 'existing-screen-id',
        screenNumber: 1
      });

      await expect(
        ScreenService.createScreen(mockTheatreId, sampleScreenInput, mockUserContext)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getScreensByTheatre', () => {
    it('should list screens for theatre when owner is authorized', async () => {
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue({
        _id: mockTheatreId,
        partnerId: mockPartnerId
      });
      jest.spyOn(ScreenRepository, 'findScreens').mockResolvedValue({
        items: [{ _id: mockScreenId, screenNumber: 1, name: 'Screen 1' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const result = await ScreenService.getScreensByTheatre(mockTheatreId, mockUserContext, {});
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getScreenById', () => {
    it('should return screen when owned by requester', async () => {
      jest.spyOn(ScreenRepository, 'findById').mockResolvedValue({
        _id: mockScreenId,
        partnerId: mockPartnerId,
        name: 'Screen 1'
      });

      const screen = await ScreenService.getScreenById(mockScreenId, mockUserContext);
      expect(screen).toBeDefined();
      expect(screen.name).toBe('Screen 1');
    });

    it('should throw NotFoundError if screen belongs to different owner', async () => {
      jest.spyOn(ScreenRepository, 'findById').mockResolvedValue({
        _id: mockScreenId,
        partnerId: mockOtherPartnerId
      });

      await expect(ScreenService.getScreenById(mockScreenId, mockUserContext)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateScreen', () => {
    it('should successfully update screen fields', async () => {
      jest.spyOn(ScreenRepository, 'findById').mockResolvedValue({
        _id: mockScreenId,
        theatreId: mockTheatreId,
        partnerId: mockPartnerId,
        screenNumber: 1
      });
      jest.spyOn(ScreenRepository, 'updateById').mockResolvedValue({
        _id: mockScreenId,
        name: 'Screen 1 - Atmos Upgrade',
        screenNumber: 1
      });

      const updated = await ScreenService.updateScreen(
        mockScreenId,
        { name: 'Screen 1 - Atmos Upgrade' },
        mockUserContext
      );

      expect(updated.name).toBe('Screen 1 - Atmos Upgrade');
    });

    it('should throw ConflictError if updated screen number collides with existing screen', async () => {
      jest.spyOn(ScreenRepository, 'findById').mockResolvedValue({
        _id: mockScreenId,
        theatreId: mockTheatreId,
        partnerId: mockPartnerId,
        screenNumber: 1
      });
      jest.spyOn(ScreenRepository, 'findByTheatreAndNumber').mockResolvedValue({
        _id: 'other-screen-id',
        screenNumber: 2
      });

      await expect(
        ScreenService.updateScreen(mockScreenId, { screenNumber: 2 }, mockUserContext)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateScreenStatus', () => {
    it('should update screen operational status', async () => {
      jest.spyOn(ScreenRepository, 'findById').mockResolvedValue({
        _id: mockScreenId,
        partnerId: mockPartnerId
      });
      jest.spyOn(ScreenRepository, 'updateById').mockResolvedValue({
        _id: mockScreenId,
        status: ScreenStatus.MAINTENANCE
      });

      const updated = await ScreenService.updateScreenStatus(
        mockScreenId,
        ScreenStatus.MAINTENANCE,
        mockUserContext
      );

      expect(updated.status).toBe(ScreenStatus.MAINTENANCE);
    });
  });

  describe('deleteScreen', () => {
    it('should soft delete screen', async () => {
      jest.spyOn(ScreenRepository, 'findById').mockResolvedValue({
        _id: mockScreenId,
        partnerId: mockPartnerId
      });
      jest.spyOn(ScreenRepository, 'softDelete').mockResolvedValue({
        _id: mockScreenId,
        isDeleted: true
      });

      const result = await ScreenService.deleteScreen(mockScreenId, mockUserContext);
      expect(result.success).toBe(true);
    });
  });

  describe('admin operations', () => {
    it('admin can list all screens across platform', async () => {
      jest.spyOn(ScreenRepository, 'findScreens').mockResolvedValue({
        items: [{ _id: mockScreenId }, { _id: 'screen-2' }],
        total: 2
      });

      const result = await ScreenService.adminListScreens({}, {});
      expect(result.items).toHaveLength(2);
    });

    it('admin can update screen without partner match', async () => {
      jest.spyOn(ScreenRepository, 'findById').mockResolvedValue({
        _id: mockScreenId,
        partnerId: mockOtherPartnerId
      });
      jest.spyOn(ScreenRepository, 'updateById').mockResolvedValue({
        _id: mockScreenId,
        name: 'Screen Admin Updated'
      });

      const updated = await ScreenService.adminUpdateScreen(
        mockScreenId,
        { name: 'Screen Admin Updated' },
        mockAdminContext
      );
      expect(updated.name).toBe('Screen Admin Updated');
    });
  });
});
