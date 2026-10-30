import { jest } from '@jest/globals';
import ShowConflictService from '../../src/modules/shows/show-conflict.service.js';
import Show from '../../src/modules/shows/show.model.js';

describe('ShowConflictService Unit Tests', () => {
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c0s1';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should detect a collision when a show interval overlaps with an existing show', async () => {
    const existingShow = {
      _id: 'existing-show-1',
      screenId: mockScreenId,
      startTime: new Date('2026-11-06T10:00:00.000Z'),
      occupiedEndTime: new Date('2026-11-06T12:50:00.000Z')
    };

    jest.spyOn(Show, 'findOne').mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(existingShow)
    });

    // Attempting 11:30 to 14:00 (overlaps with 10:00 - 12:50)
    const result = await ShowConflictService.checkScreenConflict(
      mockScreenId,
      new Date('2026-11-06T11:30:00.000Z'),
      new Date('2026-11-06T14:00:00.000Z')
    );

    expect(result.hasConflict).toBe(true);
    expect(result.conflictingShow).toBeDefined();
    expect(result.conflictingShow._id).toBe('existing-show-1');
  });

  it('should report no conflict when interval is completely clear', async () => {
    jest.spyOn(Show, 'findOne').mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null)
    });

    const result = await ShowConflictService.checkScreenConflict(
      mockScreenId,
      new Date('2026-11-06T13:00:00.000Z'),
      new Date('2026-11-06T15:30:00.000Z')
    );

    expect(result.hasConflict).toBe(false);
    expect(result.conflictingShow).toBeNull();
  });

  it('should pass excludeShowId to query when rescheduling an existing show', async () => {
    const findOneSpy = jest.spyOn(Show, 'findOne').mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null)
    });

    await ShowConflictService.checkScreenConflict(
      mockScreenId,
      new Date('2026-11-06T14:00:00.000Z'),
      new Date('2026-11-06T16:30:00.000Z'),
      'current-show-id'
    );

    expect(findOneSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $ne: 'current-show-id' },
        screenId: mockScreenId
      }),
      null,
      {}
    );
  });
});
