import { jest } from '@jest/globals';
import SeatAvailabilityService from '../../src/modules/seat-locks/seat-availability.service.js';
import seatLockRepository from '../../src/modules/seat-locks/seat-lock.repository.js';
import redisLockService from '../../src/modules/seat-locks/redis-lock.service.js';
import { SeatStatus } from '../../src/modules/screens/screen.constants.js';
import { ShowStatus } from '../../src/modules/shows/show.constants.js';
import { SeatAvailabilityStatus } from '../../src/modules/seat-locks/seat-lock.constants.js';

describe('SeatAvailabilityService Unit Tests', () => {
  const mockShowId = '65f1a2b3c4d5e6f7a8b9c001';
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c002';
  const mockCurrentUserId = '65f1a2b3c4d5e6f7a8b9c0c1';

  const mockShow = {
    _id: mockShowId,
    screenId: mockScreenId,
    layoutVersion: 1,
    status: ShowStatus.PUBLISHED,
    pricingTiers: [
      {
        categoryCode: 'REGULAR',
        categoryName: 'Regular',
        basePrice: 150,
        convenienceFee: 20,
        taxPercent: 18,
        effectivePrice: 177
      },
      {
        categoryCode: 'RECLINER',
        categoryName: 'VIP Recliner',
        basePrice: 450,
        convenienceFee: 40,
        taxPercent: 18,
        effectivePrice: 531
      }
    ]
  };

  const mockSeats = [
    {
      _id: 'seat-1',
      rowLabel: 'A',
      columnNumber: 1,
      gridRow: 0,
      gridCol: 0,
      seatLabel: 'A1',
      categoryCode: 'REGULAR',
      type: 'NORMAL',
      status: SeatStatus.ACTIVE,
      isAvailable: true
    },
    {
      _id: 'seat-2',
      rowLabel: 'A',
      columnNumber: 2,
      gridRow: 0,
      gridCol: 1,
      seatLabel: 'A2',
      categoryCode: 'REGULAR',
      type: 'NORMAL',
      status: SeatStatus.ACTIVE,
      isAvailable: true
    },
    {
      _id: 'seat-3',
      rowLabel: 'A',
      columnNumber: 3,
      gridRow: 0,
      gridCol: 2,
      seatLabel: 'A3',
      categoryCode: 'REGULAR',
      type: 'NORMAL',
      status: SeatStatus.BLOCKED,
      isAvailable: true
    },
    {
      _id: 'seat-4',
      rowLabel: 'A',
      columnNumber: 4,
      gridRow: 0,
      gridCol: 3,
      seatLabel: 'A4',
      categoryCode: 'REGULAR',
      type: 'NORMAL',
      status: SeatStatus.MAINTENANCE,
      isAvailable: true
    },
    {
      _id: 'seat-5',
      rowLabel: 'A',
      columnNumber: 5,
      gridRow: 0,
      gridCol: 4,
      seatLabel: 'A5',
      categoryCode: 'REGULAR',
      type: 'NORMAL',
      status: SeatStatus.INACTIVE,
      isAvailable: true
    },
    {
      _id: 'seat-6',
      rowLabel: 'B',
      columnNumber: 1,
      gridRow: 1,
      gridCol: 0,
      seatLabel: 'B1',
      categoryCode: 'RECLINER',
      type: 'RECLINER',
      status: SeatStatus.ACTIVE,
      isAvailable: true
    },
    {
      _id: 'seat-7',
      rowLabel: 'B',
      columnNumber: 2,
      gridRow: 1,
      gridCol: 1,
      seatLabel: 'B2',
      categoryCode: 'RECLINER',
      type: 'RECLINER',
      status: SeatStatus.ACTIVE,
      isAvailable: true
    }
  ];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should accurately calculate seat availability from physical seats, booked MongoDB seats, and active Redis locks', async () => {
    jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
    jest.spyOn(seatLockRepository, 'findSeatsByScreenAndVersion').mockResolvedValue(mockSeats);

    // seat-2 is booked in MongoDB
    jest
      .spyOn(seatLockRepository, 'findBookedSeatIdsForShow')
      .mockResolvedValue(new Set(['seat-2']));

    // seat-6 is locked by current user; seat-7 is locked by another user
    const activeLocks = new Map();
    activeLocks.set('seat-6', { userId: mockCurrentUserId, lockId: 'lock-me' });
    activeLocks.set('seat-7', { userId: 'other-user', lockId: 'lock-other' });

    jest.spyOn(redisLockService, 'getActiveLocksForShow').mockResolvedValue(activeLocks);

    const result = await SeatAvailabilityService.getShowSeatAvailability(
      mockShowId,
      mockCurrentUserId
    );

    expect(result.show.id).toBe(mockShowId);
    expect(result.rows).toHaveLength(2); // Rows A and B

    const rowA = result.rows.find(r => r.rowLabel === 'A');
    const rowB = result.rows.find(r => r.rowLabel === 'B');

    // Seat A1: Clean Available
    expect(rowA.seats[0].status).toBe(SeatAvailabilityStatus.AVAILABLE);
    expect(rowA.seats[0].isLockedByMe).toBe(false);

    // Seat A2: Booked
    expect(rowA.seats[1].status).toBe(SeatAvailabilityStatus.BOOKED);

    // Seat A3: Blocked
    expect(rowA.seats[2].status).toBe(SeatAvailabilityStatus.BLOCKED);

    // Seat A4: Maintenance
    expect(rowA.seats[3].status).toBe(SeatAvailabilityStatus.MAINTENANCE);

    // Seat A5: Inactive
    expect(rowA.seats[4].status).toBe(SeatAvailabilityStatus.INACTIVE);

    // Seat B1: Locked by current user
    expect(rowB.seats[0].status).toBe(SeatAvailabilityStatus.LOCKED_BY_ME);
    expect(rowB.seats[0].isLockedByMe).toBe(true);

    // Seat B2: Locked by other user
    expect(rowB.seats[1].status).toBe(SeatAvailabilityStatus.LOCKED_BY_OTHER);
    expect(rowB.seats[1].isLockedByMe).toBe(false);

    // Pricing tiers correctly mapped
    expect(rowA.seats[0].pricing.basePrice).toBe(150);
    expect(rowB.seats[0].pricing.basePrice).toBe(450);

    // Stats correctly tallied
    expect(result.stats.totalSeats).toBe(7);
    expect(result.stats.availableSeats).toBe(1);
    expect(result.stats.bookedSeats).toBe(1);
    expect(result.stats.lockedSeats).toBe(2);
    expect(result.stats.blockedSeats).toBe(1);
    expect(result.stats.maintenanceSeats).toBe(1);
    expect(result.stats.inactiveSeats).toBe(1);
  });

  it('should treat user as unauthenticated guest when userId is null', async () => {
    jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
    jest.spyOn(seatLockRepository, 'findSeatsByScreenAndVersion').mockResolvedValue([mockSeats[0]]);
    jest.spyOn(seatLockRepository, 'findBookedSeatIdsForShow').mockResolvedValue(new Set());

    const activeLocks = new Map();
    activeLocks.set('seat-1', { userId: 'any-user', lockId: 'lock-1' });
    jest.spyOn(redisLockService, 'getActiveLocksForShow').mockResolvedValue(activeLocks);

    const result = await SeatAvailabilityService.getShowSeatAvailability(mockShowId, null);

    expect(result.rows[0].seats[0].status).toBe(SeatAvailabilityStatus.LOCKED_BY_OTHER);
    expect(result.rows[0].seats[0].isLockedByMe).toBe(false);
  });

  it('should throw NotFoundError when show does not exist', async () => {
    jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(null);

    await expect(
      SeatAvailabilityService.getShowSeatAvailability('nonexistent')
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'NOT_FOUND'
    });
  });

  it('should throw ConflictError when show is cancelled', async () => {
    jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue({
      ...mockShow,
      status: ShowStatus.CANCELLED
    });

    await expect(SeatAvailabilityService.getShowSeatAvailability(mockShowId)).rejects.toMatchObject(
      {
        statusCode: 409,
        errorCode: 'SHOW_ALREADY_CANCELLED'
      }
    );
  });
});
