import { jest } from '@jest/globals';
import ShowService from '../../src/modules/shows/show.service.js';
import ShowRepository from '../../src/modules/shows/show.repository.js';
import MovieRepository from '../../src/modules/movies/movie.repository.js';
import TheatreRepository from '../../src/modules/theatres/theatre.repository.js';
import ScreenRepository from '../../src/modules/screens/screen.repository.js';
import SeatingLayoutRepository from '../../src/modules/screens/seating-layout/seating-layout.repository.js';
import ShowConflictService from '../../src/modules/shows/show-conflict.service.js';
import ShowScheduleService from '../../src/modules/shows/show-schedule.service.js';
import { ShowStatus } from '../../src/modules/shows/show.constants.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { NotFoundError } from '../../src/common/errors/not-found.error.js';
import { ValidationError } from '../../src/common/errors/validation.error.js';
import { ConflictError } from '../../src/common/errors/conflict.error.js';

describe('ShowService Unit Tests', () => {
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockOtherPartnerId = '65f1a2b3c4d5e6f7a8b9c0b2';
  const mockTheatreId = '65f1a2b3c4d5e6f7a8b9c0t1';
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c0s1';
  const mockMovieId = '65f1a2b3c4d5e6f7a8b9c0m1';
  const mockCityId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const mockLayoutId = '65f1a2b3c4d5e6f7a8b9c0l1';
  const mockShowId = '65f1a2b3c4d5e6f7a8b9c0h1';

  const mockUserContext = {
    id: 'user-1',
    role: Roles.THEATRE_OWNER,
    partnerId: mockPartnerId
  };

  const sampleShowInput = {
    theatreId: mockTheatreId,
    screenId: mockScreenId,
    movieId: mockMovieId,
    startTime: '2026-11-06T19:30:00.000Z',
    format: '2D',
    language: 'Hindi'
  };

  const mockMovie = {
    _id: mockMovieId,
    title: 'Interstellar',
    durationMins: 169,
    status: 'NOW_SHOWING',
    censorRating: 'UA',
    languages: [{ name: 'Hindi' }]
  };

  const mockTheatre = {
    _id: mockTheatreId,
    partnerId: mockPartnerId,
    status: 'APPROVED',
    address: { cityId: mockCityId },
    timezone: 'Asia/Kolkata'
  };

  const mockScreen = {
    _id: mockScreenId,
    theatreId: mockTheatreId,
    partnerId: mockPartnerId,
    status: 'ACTIVE',
    isActive: true,
    soundSystem: 'Dolby Atmos'
  };

  const mockLayout = {
    _id: mockLayoutId,
    layoutVersion: 1,
    totalSeats: 150,
    bookableSeats: 148,
    categoryBreakdown: [{ categoryCode: 'REGULAR' }, { categoryCode: 'PREMIUM' }]
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createShow', () => {
    it('should successfully schedule a show within the concurrency lock', async () => {
      jest.spyOn(MovieRepository, 'findById').mockResolvedValue(mockMovie);
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue(mockTheatre);
      jest.spyOn(ScreenRepository, 'findById').mockResolvedValue(mockScreen);
      jest
        .spyOn(SeatingLayoutRepository, 'findLatestPublishedByScreen')
        .mockResolvedValue(mockLayout);
      jest.spyOn(ShowConflictService, 'checkScreenConflict').mockResolvedValue({
        hasConflict: false,
        conflictingShow: null
      });
      jest
        .spyOn(ShowScheduleService, 'executeWithScheduleLock')
        .mockImplementation(async (_screenId, task) => task(null));
      jest
        .spyOn(ShowRepository, 'create')
        .mockImplementation(data => Promise.resolve({ _id: mockShowId, ...data }));
      jest.spyOn(ShowRepository, 'findById').mockResolvedValue({
        _id: mockShowId,
        movieId: mockMovieId,
        status: ShowStatus.DRAFT
      });

      const show = await ShowService.createShow(sampleShowInput, mockUserContext);
      expect(show).toBeDefined();
      expect(show._id).toBe(mockShowId);
      expect(show.status).toBe(ShowStatus.DRAFT);
    });

    it('should throw ValidationError if movie is not approved for scheduling', async () => {
      jest.spyOn(MovieRepository, 'findById').mockResolvedValue({
        ...mockMovie,
        status: 'DRAFT'
      });

      await expect(ShowService.createShow(sampleShowInput, mockUserContext)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw NotFoundError if theatre belongs to different partner', async () => {
      jest.spyOn(MovieRepository, 'findById').mockResolvedValue(mockMovie);
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue({
        ...mockTheatre,
        partnerId: mockOtherPartnerId
      });

      await expect(ShowService.createShow(sampleShowInput, mockUserContext)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ValidationError if screen is in MAINTENANCE', async () => {
      jest.spyOn(MovieRepository, 'findById').mockResolvedValue(mockMovie);
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue(mockTheatre);
      jest.spyOn(ScreenRepository, 'findById').mockResolvedValue({
        ...mockScreen,
        status: 'MAINTENANCE'
      });

      await expect(ShowService.createShow(sampleShowInput, mockUserContext)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ConflictError if interval conflicts with existing show', async () => {
      jest.spyOn(MovieRepository, 'findById').mockResolvedValue(mockMovie);
      jest.spyOn(TheatreRepository, 'findById').mockResolvedValue(mockTheatre);
      jest.spyOn(ScreenRepository, 'findById').mockResolvedValue(mockScreen);
      jest
        .spyOn(SeatingLayoutRepository, 'findLatestPublishedByScreen')
        .mockResolvedValue(mockLayout);
      jest
        .spyOn(ShowScheduleService, 'executeWithScheduleLock')
        .mockImplementation(async (_screenId, task) => task(null));
      jest.spyOn(ShowConflictService, 'checkScreenConflict').mockResolvedValue({
        hasConflict: true,
        conflictingShow: { _id: 'collision-show', occupiedEndTime: new Date() }
      });

      await expect(ShowService.createShow(sampleShowInput, mockUserContext)).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('rescheduleShow', () => {
    it('should reschedule show when new interval is conflict-free', async () => {
      const existingShow = {
        _id: mockShowId,
        partnerId: mockPartnerId,
        screenId: mockScreenId,
        startTime: new Date('2026-11-06T10:00:00.000Z'),
        endTime: new Date('2026-11-06T12:00:00.000Z'),
        status: ShowStatus.DRAFT,
        movieSnapshot: { durationMins: 120 }
      };

      jest.spyOn(ShowRepository, 'findById').mockResolvedValue(existingShow);
      jest
        .spyOn(ShowScheduleService, 'executeWithScheduleLock')
        .mockImplementation(async (_screenId, task) => task(null));
      jest.spyOn(ShowConflictService, 'checkScreenConflict').mockResolvedValue({
        hasConflict: false,
        conflictingShow: null
      });
      jest.spyOn(ShowRepository, 'updateById').mockResolvedValue({
        ...existingShow,
        startTime: new Date('2026-11-06T14:00:00.000Z')
      });

      const rescheduled = await ShowService.rescheduleShow(
        mockShowId,
        { newStartTime: '2026-11-06T14:00:00.000Z', reason: 'Postponed' },
        mockUserContext
      );

      expect(rescheduled).toBeDefined();
    });
  });

  describe('publishShow', () => {
    it('should publish show when all layout categories have pricing', async () => {
      const draftShow = {
        _id: mockShowId,
        partnerId: mockPartnerId,
        layoutId: mockLayoutId,
        status: ShowStatus.DRAFT,
        pricingTiers: [
          { categoryCode: 'REGULAR', basePrice: 150 },
          { categoryCode: 'PREMIUM', basePrice: 250 }
        ]
      };

      jest.spyOn(ShowRepository, 'findById').mockResolvedValue(draftShow);
      jest.spyOn(SeatingLayoutRepository, 'findById').mockResolvedValue(mockLayout);
      jest.spyOn(ShowRepository, 'updateById').mockResolvedValue({
        ...draftShow,
        status: ShowStatus.PUBLISHED
      });

      const published = await ShowService.publishShow(mockShowId, mockUserContext);
      expect(published.status).toBe(ShowStatus.PUBLISHED);
    });

    it('should throw ValidationError if any layout category is missing pricing', async () => {
      const draftShow = {
        _id: mockShowId,
        partnerId: mockPartnerId,
        layoutId: mockLayoutId,
        status: ShowStatus.DRAFT,
        pricingTiers: [
          { categoryCode: 'REGULAR', basePrice: 150 }
          // Missing PREMIUM tier!
        ]
      };

      jest.spyOn(ShowRepository, 'findById').mockResolvedValue(draftShow);
      jest.spyOn(SeatingLayoutRepository, 'findById').mockResolvedValue(mockLayout);

      await expect(ShowService.publishShow(mockShowId, mockUserContext)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('cancelShow', () => {
    it('should cancel show with cancellation reason', async () => {
      const activeShow = {
        _id: mockShowId,
        partnerId: mockPartnerId,
        status: ShowStatus.PUBLISHED
      };

      jest.spyOn(ShowRepository, 'findById').mockResolvedValue(activeShow);
      jest.spyOn(ShowRepository, 'updateById').mockResolvedValue({
        ...activeShow,
        status: ShowStatus.CANCELLED,
        cancellationReason: 'Technical projector fault'
      });

      const cancelled = await ShowService.cancelShow(
        mockShowId,
        'Technical projector fault',
        mockUserContext
      );

      expect(cancelled.status).toBe(ShowStatus.CANCELLED);
    });

    it('should throw ConflictError if show is already cancelled', async () => {
      const cancelledShow = {
        _id: mockShowId,
        partnerId: mockPartnerId,
        status: ShowStatus.CANCELLED
      };

      jest.spyOn(ShowRepository, 'findById').mockResolvedValue(cancelledShow);

      await expect(ShowService.cancelShow(mockShowId, 'Reason', mockUserContext)).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('public queries', () => {
    it('searchPublicShows should only query PUBLISHED status', async () => {
      const findShowsSpy = jest.spyOn(ShowRepository, 'findShows').mockResolvedValue({
        items: [{ _id: mockShowId, status: ShowStatus.PUBLISHED }],
        total: 1
      });

      await ShowService.searchPublicShows({ movieId: mockMovieId }, {});

      expect(findShowsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: [ShowStatus.PUBLISHED] },
          movieId: mockMovieId
        }),
        {}
      );
    });

    it('getPublicShowDetails should reject un-published shows', async () => {
      jest.spyOn(ShowRepository, 'findById').mockResolvedValue({
        _id: mockShowId,
        status: ShowStatus.DRAFT
      });

      await expect(ShowService.getPublicShowDetails(mockShowId)).rejects.toThrow(NotFoundError);
    });
  });
});
