import { jest } from '@jest/globals';
import ShowService from '../../src/modules/shows/show.service.js';
import MovieRepository from '../../src/modules/movies/movie.repository.js';
import TheatreRepository from '../../src/modules/theatres/theatre.repository.js';
import ScreenRepository from '../../src/modules/screens/screen.repository.js';
import SeatingLayoutRepository from '../../src/modules/screens/seating-layout/seating-layout.repository.js';
import ShowConflictService from '../../src/modules/shows/show-conflict.service.js';
import ShowScheduleService from '../../src/modules/shows/show-schedule.service.js';
import ShowRepository from '../../src/modules/shows/show.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';

describe('Show Concurrency & Race Condition Protection Tests', () => {
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockTheatreId = '65f1a2b3c4d5e6f7a8b9c0t1';
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c0s1';
  const mockMovieId = '65f1a2b3c4d5e6f7a8b9c0m1';

  const mockUserContext = {
    id: 'user-1',
    role: Roles.THEATRE_OWNER,
    partnerId: mockPartnerId
  };

  const mockMovie = {
    _id: mockMovieId,
    title: 'Dune: Part Two',
    durationMins: 166,
    status: 'NOW_SHOWING',
    languages: [{ name: 'English' }]
  };

  const mockTheatre = {
    _id: mockTheatreId,
    partnerId: mockPartnerId,
    status: 'APPROVED',
    address: { cityId: 'city-1' }
  };

  const mockScreen = {
    _id: mockScreenId,
    theatreId: mockTheatreId,
    partnerId: mockPartnerId,
    status: 'ACTIVE',
    isActive: true
  };

  const mockLayout = {
    _id: 'layout-1',
    layoutVersion: 1,
    totalSeats: 200,
    bookableSeats: 198,
    categoryBreakdown: [{ categoryCode: 'REGULAR' }]
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should allow only one concurrent request when two requests attempt to schedule overlapping shows simultaneously', async () => {
    jest.spyOn(MovieRepository, 'findById').mockResolvedValue(mockMovie);
    jest.spyOn(TheatreRepository, 'findById').mockResolvedValue(mockTheatre);
    jest.spyOn(ScreenRepository, 'findById').mockResolvedValue(mockScreen);
    jest
      .spyOn(SeatingLayoutRepository, 'findLatestPublishedByScreen')
      .mockResolvedValue(mockLayout);

    // Simulate real distributed screen mutex:
    // First caller acquires lock, second caller gets acquired: false
    let lockTaken = false;
    jest.spyOn(ShowScheduleService, 'acquireScreenLock').mockImplementation(async () => {
      if (!lockTaken) {
        lockTaken = true;
        return { acquired: true, token: 'winner-token' };
      }
      return { acquired: false, token: null };
    });
    jest.spyOn(ShowScheduleService, 'releaseScreenLock').mockResolvedValue(true);

    jest.spyOn(ShowConflictService, 'checkScreenConflict').mockResolvedValue({
      hasConflict: false,
      conflictingShow: null
    });

    let createdId = 0;
    jest.spyOn(ShowRepository, 'create').mockImplementation(data => {
      createdId += 1;
      return Promise.resolve({ _id: `show-${createdId}`, ...data });
    });
    jest
      .spyOn(ShowRepository, 'findById')
      .mockImplementation(id => Promise.resolve({ _id: id, status: 'DRAFT' }));

    const requestA = ShowService.createShow(
      {
        theatreId: mockTheatreId,
        screenId: mockScreenId,
        movieId: mockMovieId,
        startTime: '2026-11-06T14:00:00.000Z'
      },
      mockUserContext
    );

    const requestB = ShowService.createShow(
      {
        theatreId: mockTheatreId,
        screenId: mockScreenId,
        movieId: mockMovieId,
        startTime: '2026-11-06T14:30:00.000Z' // Overlaps with 14:00
      },
      mockUserContext
    );

    const results = await Promise.allSettled([requestA, requestB]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // Invariant: Exactly one succeeded and exactly one failed with conflict
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.statusCode).toBe(409);
    expect(rejected[0].reason.errorCode).toBe('SCHEDULE_CONFLICT');
  });
});
