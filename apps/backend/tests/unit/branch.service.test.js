import { jest } from '@jest/globals';
import BranchService from '../../src/modules/theatres/branch/branch.service.js';
import TheatreService from '../../src/modules/theatres/theatre.service.js';
import TheatreRepository from '../../src/modules/theatres/theatre.repository.js';
import Theatre from '../../src/modules/theatres/model/theatre.model.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';

describe('BranchService Unit Tests', () => {
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockUserId = '65f1a2b3c4d5e6f7a8b9c0u1';
  const mockParentTheatreId = '65f1a2b3c4d5e6f7a8b9c0t1';
  const mockBranchId = '65f1a2b3c4d5e6f7a8b9c0b2';

  const mockUserContext = {
    id: mockUserId,
    email: 'owner@pvr.com',
    role: Roles.THEATRE_OWNER,
    partnerId: mockPartnerId
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createBranch', () => {
    it('should create a branch linked to the parent theatre and partner', async () => {
      const parentTheatre = { _id: mockParentTheatreId, partnerId: mockPartnerId };
      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(parentTheatre);
      jest.spyOn(TheatreService, 'registerTheatre').mockResolvedValue({
        _id: mockBranchId,
        parentTheatreId: mockParentTheatreId,
        isBranch: true
      });

      const branchInput = { name: 'PVR Phoenix Branch 2' };
      const result = await BranchService.createBranch(
        mockParentTheatreId,
        branchInput,
        mockUserContext
      );

      expect(result._id).toBe(mockBranchId);
      expect(result.parentTheatreId).toBe(mockParentTheatreId);
      expect(result.isBranch).toBe(true);
    });

    it('should throw NotFoundError if parent theatre does not belong to partner', async () => {
      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(null);

      await expect(
        BranchService.createBranch(mockParentTheatreId, { name: 'Branch' }, mockUserContext)
      ).rejects.toThrow(/Parent theatre not found/);
    });
  });

  describe('listBranches', () => {
    it('should return branches belonging to parent theatre and partner', async () => {
      const parentTheatre = { _id: mockParentTheatreId, partnerId: mockPartnerId };
      const branchesList = [{ _id: mockBranchId, name: 'Branch 1' }];

      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(parentTheatre);
      jest.spyOn(Theatre, 'find').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(branchesList)
      });

      const result = await BranchService.listBranches(mockParentTheatreId, mockUserContext);
      expect(result).toEqual(branchesList);
    });
  });

  describe('getBranchById', () => {
    it('should return branch when owned by partner', async () => {
      const branchDoc = { _id: mockBranchId, partnerId: mockPartnerId, name: 'Branch' };
      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(branchDoc);

      const result = await BranchService.getBranchById(mockBranchId, mockUserContext);
      expect(result).toEqual(branchDoc);
    });

    it('should throw NotFoundError if branch belongs to another owner', async () => {
      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(null);

      await expect(BranchService.getBranchById(mockBranchId, mockUserContext)).rejects.toThrow(
        /Branch not found/
      );
    });
  });

  describe('toggleBranchStatus', () => {
    it('should toggle active status of branch', async () => {
      const branchDoc = { _id: mockBranchId, partnerId: mockPartnerId, isActive: true };
      jest.spyOn(TheatreRepository, 'findByIdAndPartnerId').mockResolvedValue(branchDoc);
      jest.spyOn(TheatreRepository, 'updateWithPartner').mockResolvedValue({
        ...branchDoc,
        isActive: false
      });

      const result = await BranchService.toggleBranchStatus(mockBranchId, false, mockUserContext);
      expect(result.isActive).toBe(false);
    });
  });
});
