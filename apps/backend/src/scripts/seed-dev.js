/**
 * Development Seed Script for Local Execution
 * Provisions demo data (Admin, Theatre Partner, Customer, City, Theatres, Screens, Layouts, Movies, Shows)
 * Idempotent: checks for existence before creation.
 * Run via: npm run seed:dev or node src/scripts/seed-dev.js
 */
import mongoose from 'mongoose';
import logger from '../config/logger.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../modules/users/model/user.model.js';
import { TheatrePartner } from '../modules/auth/model/theatre-partner.model.js';
import { Roles, ApprovalStatus } from '../modules/auth/auth.constants.js';
import { hashPassword, normalizeEmail, normalizeMobile } from '../modules/auth/auth.utils.js';
import AuthRepository from '../modules/auth/auth.repository.js';
import { City } from '../modules/theatres/model/city.model.js';
import { Theatre } from '../modules/theatres/model/theatre.model.js';
import { Screen } from '../modules/screens/screen.model.js';
import { SeatCategory } from '../modules/screens/seat-category/seat-category.model.js';
import { SeatingLayout } from '../modules/screens/seating-layout/seating-layout.model.js';
import { Seat } from '../modules/screens/seat/seat.model.js';
import { Movie } from '../modules/movies/model/movie.model.js';
import { Genre } from '../modules/movies/model/genre.model.js';
import { Language } from '../modules/movies/model/language.model.js';
import { Show } from '../modules/shows/show.model.js';
import { ShowPricing } from '../modules/shows/show-pricing/show-pricing.model.js';
import { MovieStatus, CensorRating, MovieFormat } from '../modules/movies/movie.constants.js';
import { TheatreStatus } from '../modules/theatres/theatre.constants.js';
import { ScreenType, ScreenStatus, LayoutStatus, SeatType, SeatStatus } from '../modules/screens/screen.constants.js';
import { ShowStatus, ShowFormat } from '../modules/shows/show.constants.js';

export async function seedDevelopmentData() {
  try {
    logger.info('Connecting to database for development seeding...');
    await connectDatabase();

    // ─── 1. Super Admin ──────────────────────────────────────────────────────────
    const adminEmail = normalizeEmail(process.env.SUPER_ADMIN_EMAIL || 'admin@bookmyshow.clone');
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      const passwordHash = await hashPassword(process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@Secure2026!');
      adminUser = await AuthRepository.createUser({
        name: 'Platform Super Admin',
        email: adminEmail,
        phone: normalizeMobile('9876543210'),
        passwordHash,
        role: Roles.SUPER_ADMIN,
        approvalStatus: ApprovalStatus.APPROVED,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true
      });
      logger.info(`Provisioned Super Admin: ${adminEmail}`);
    }

    // ─── 2. Theatre Partner & Owner ──────────────────────────────────────────────
    const ownerEmail = normalizeEmail('owner@pvr.com');
    let ownerUser = await User.findOne({ email: ownerEmail });
    let partnerEntity;

    if (!ownerUser) {
      const passwordHash = await hashPassword('Owner@Secure2026!');
      ownerUser = await AuthRepository.createUser({
        name: 'PVR Exhibitor Admin',
        email: ownerEmail,
        phone: normalizeMobile('9876543211'),
        passwordHash,
        role: Roles.THEATRE_OWNER,
        approvalStatus: ApprovalStatus.APPROVED,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true
      });

      partnerEntity = await AuthRepository.createTheatrePartner({
        ownerUserId: ownerUser._id,
        businessName: 'PVR INOX Ltd',
        businessEmail: ownerEmail,
        businessPhone: '9876543211',
        businessAddress: 'Phoenix Palladium, Lower Parel, Mumbai, Maharashtra 400013',
        gstin: '27AABCP1234F1Z5',
        pan: 'AABCP1234F',
        kycStatus: 'VERIFIED'
      });

      await AuthRepository.updateUser(ownerUser._id, { partnerId: partnerEntity._id });
      logger.info(`Provisioned Theatre Partner Owner: ${ownerEmail}`);
    } else {
      partnerEntity = await TheatrePartner.findOne({ ownerUserId: ownerUser._id });
      if (!partnerEntity && ownerUser.partnerId) {
        partnerEntity = await TheatrePartner.findById(ownerUser.partnerId);
      }
      if (!partnerEntity) {
        partnerEntity = await AuthRepository.createTheatrePartner({
          ownerUserId: ownerUser._id,
          businessName: 'PVR INOX Ltd',
          businessEmail: ownerEmail,
          businessPhone: '9876543211',
          businessAddress: 'Phoenix Palladium, Lower Parel, Mumbai, Maharashtra 400013',
          gstin: '27AABCP1234F1Z5',
          pan: 'AABCP1234F',
          kycStatus: 'VERIFIED'
        });
        await AuthRepository.updateUser(ownerUser._id, { partnerId: partnerEntity._id });
      }
    }

    // ─── 3. Customer Account ─────────────────────────────────────────────────────
    const customerEmail = normalizeEmail('customer@gmail.com');
    let customerUser = await User.findOne({ email: customerEmail });
    if (!customerUser) {
      const passwordHash = await hashPassword('Customer@Secure2026!');
      customerUser = await AuthRepository.createUser({
        name: 'Demo Moviegoer',
        email: customerEmail,
        phone: normalizeMobile('9876543212'),
        passwordHash,
        role: Roles.CUSTOMER,
        approvalStatus: ApprovalStatus.APPROVED,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true
      });
      logger.info(`Provisioned Customer: ${customerEmail}`);
    }

    // ─── 4. City: Mumbai ─────────────────────────────────────────────────────────
    let mumbaiCity = await City.findOne({ slug: 'mumbai' });
    if (!mumbaiCity) {
      mumbaiCity = await City.create({
        name: 'Mumbai',
        slug: 'mumbai',
        state: 'Maharashtra',
        country: 'India',
        isActive: true,
        isMetro: true,
        coordinates: {
          type: 'Point',
          coordinates: [72.8777, 19.076]
        }
      });
      logger.info('Provisioned City: Mumbai');
    }

    // ─── 5. Approved Theatre Complex ─────────────────────────────────────────────
    let theatre = await Theatre.findOne({ partnerId: partnerEntity._id });
    if (!theatre) {
      theatre = await Theatre.create({
        partnerId: partnerEntity._id,
        name: 'PVR INOX Phoenix Palladium',
        slug: 'pvr-inox-phoenix-palladium-mumbai',
        status: TheatreStatus.APPROVED,
        isActive: true,
        contactEmail: 'support@pvr.example.com',
        contactPhone: '+919876543211',
        websiteUrl: 'https://pvr.example.com',
        address: {
          street: 'Senapati Bapat Marg, Lower Parel',
          area: 'Lower Parel',
          cityId: mumbaiCity._id,
          cityName: mumbaiCity.name,
          state: 'Maharashtra',
          pincode: '400013',
          country: 'India'
        },
        location: {
          type: 'Point',
          coordinates: [72.8258, 18.9953]
        },
        totalScreens: 1,
        amenities: ['PARKING', 'FOOD_BEVERAGES', 'WHEELCHAIR_ACCESS', 'DOLBY_ATMOS', 'RECLINERS'],
        createdBy: ownerUser._id
      });
      logger.info(`Provisioned Theatre: ${theatre.name}`);
    }

    // ─── 6. Auditorium / Screen ──────────────────────────────────────────────────
    let screen = await Screen.findOne({ theatreId: theatre._id });
    if (!screen) {
      screen = await Screen.create({
        theatreId: theatre._id,
        partnerId: partnerEntity._id,
        name: 'Audi 1 - IMAX with Laser',
        screenNumber: 1,
        screenType: ScreenType.IMAX,
        supportedFormats: ['2D', '3D', 'IMAX_2D', 'IMAX_3D'],
        soundSystem: 'Dolby Atmos',
        totalSeats: 50,
        totalRows: 5,
        totalColumns: 10,
        status: ScreenStatus.ACTIVE,
        isActive: true,
        createdBy: ownerUser._id
      });
      logger.info(`Provisioned Screen: ${screen.name}`);
    }

    // ─── 7. Seat Categories ──────────────────────────────────────────────────────
    const categoriesData = [
      { code: 'VIP', name: 'VIP Recliner', basePrice: 500, color: '#f59e0b', sortOrder: 1 },
      { code: 'PREMIUM', name: 'Premium Central', basePrice: 350, color: '#3b82f6', sortOrder: 2 },
      { code: 'EXECUTIVE', name: 'Executive Standard', basePrice: 250, color: '#10b981', sortOrder: 3 }
    ];

    for (const cat of categoriesData) {
      const existing = await SeatCategory.findOne({ code: cat.code, partnerId: partnerEntity._id });
      if (!existing) {
        await SeatCategory.create({
          partnerId: partnerEntity._id,
          name: cat.name,
          code: cat.code,
          basePrice: cat.basePrice,
          displayColor: cat.color,
          sortOrder: cat.sortOrder,
          isActive: true
        });
      }
    }

    // ─── 8. Seating Layout & Physical Seats ──────────────────────────────────────
    let layout = await SeatingLayout.findOne({ screenId: screen._id, layoutVersion: 1 });
    if (!layout) {
      const layoutSeats = [];
      const physicalSeats = [];
      const rows = [
        { label: 'A', category: 'VIP', count: 10 },
        { label: 'B', category: 'PREMIUM', count: 10 },
        { label: 'C', category: 'PREMIUM', count: 10 },
        { label: 'D', category: 'EXECUTIVE', count: 10 },
        { label: 'E', category: 'EXECUTIVE', count: 10 }
      ];

      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        for (let c = 1; c <= row.count; c++) {
          const seatLabel = `${row.label}${c}`;
          layoutSeats.push({
            rowLabel: row.label,
            columnNumber: c,
            seatLabel,
            categoryCode: row.category,
            type: SeatType.NORMAL,
            status: SeatStatus.ACTIVE,
            gridRow: rIdx + 1,
            gridCol: c,
            isAvailable: true
          });

          physicalSeats.push({
            screenId: screen._id,
            theatreId: theatre._id,
            partnerId: partnerEntity._id,
            layoutVersion: 1,
            rowLabel: row.label,
            columnNumber: c,
            seatLabel,
            categoryCode: row.category,
            type: SeatType.NORMAL,
            status: SeatStatus.ACTIVE,
            gridRow: rIdx + 1,
            gridCol: c,
            isAvailable: true
          });
        }
      }

      layout = await SeatingLayout.create({
        screenId: screen._id,
        theatreId: theatre._id,
        partnerId: partnerEntity._id,
        layoutVersion: 1,
        name: 'Standard IMAX 50-Seat Layout',
        status: LayoutStatus.PUBLISHED,
        totalRows: 5,
        totalColumns: 10,
        totalSeats: 50,
        bookableSeats: 50,
        categoryBreakdown: [
          { categoryCode: 'VIP', count: 10, bookableCount: 10 },
          { categoryCode: 'PREMIUM', count: 20, bookableCount: 20 },
          { categoryCode: 'EXECUTIVE', count: 20, bookableCount: 20 }
        ],
        seats: layoutSeats,
        publishedAt: new Date(),
        publishedBy: ownerUser._id,
        createdBy: ownerUser._id
      });

      await Seat.deleteMany({ screenId: screen._id });
      await Seat.insertMany(physicalSeats);
      logger.info('Provisioned Seating Layout & 50 Physical Seats');
    }

    // ─── 9. Languages and Genres ─────────────────────────────────────────────────
    const languagesData = [
      { name: 'English', code: 'en', nativeName: 'English' },
      { name: 'Hindi', code: 'hi', nativeName: 'हिन्दी' },
      { name: 'Tamil', code: 'ta', nativeName: 'தமிழ்' },
      { name: 'Telugu', code: 'te', nativeName: 'తెలుగు' }
    ];
    const languageDocs = {};
    for (const lang of languagesData) {
      let doc = await Language.findOne({ code: lang.code });
      if (!doc) {
        doc = await Language.create(lang);
      }
      languageDocs[lang.code] = doc;
    }

    const genresData = [
      { name: 'Action', slug: 'action' },
      { name: 'Adventure', slug: 'adventure' },
      { name: 'Sci-Fi', slug: 'sci-fi' },
      { name: 'Drama', slug: 'drama' },
      { name: 'Thriller', slug: 'thriller' },
      { name: 'Biography', slug: 'biography' },
      { name: 'History', slug: 'history' }
    ];
    const genreDocs = {};
    for (const g of genresData) {
      let doc = await Genre.findOne({ slug: g.slug });
      if (!doc) {
        doc = await Genre.create(g);
      }
      genreDocs[g.slug] = doc;
    }

    // ─── 10. Published Movie Catalog ─────────────────────────────────────────────
    const moviesData = [
      {
        title: 'Dune: Part Two',
        slug: 'dune-part-two',
        synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
        durationMins: 166,
        originalLanguageId: languageDocs.en._id,
        languageIds: [languageDocs.en._id, languageDocs.hi._id],
        genreIds: [genreDocs['action']._id, genreDocs['sci-fi']._id],
        genreSlugs: ['action', 'sci-fi'],
        censorRating: CensorRating.UA,
        availableFormats: [MovieFormat.TWO_D, MovieFormat.IMAX_2D],
        releaseDate: new Date('2024-03-01'),
        posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600',
        backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200',
        trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
        cast: [{ name: 'Timothée Chalamet', role: 'ACTOR', character: 'Paul Atreides' }, { name: 'Zendaya', role: 'ACTOR', character: 'Chani' }],
        crew: [{ name: 'Denis Villeneuve', role: 'Director' }],
        status: MovieStatus.NOW_SHOWING
      },
      {
        title: 'Oppenheimer',
        slug: 'oppenheimer',
        synopsis: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
        durationMins: 180,
        originalLanguageId: languageDocs.en._id,
        languageIds: [languageDocs.en._id, languageDocs.hi._id],
        genreIds: [genreDocs['biography']._id, genreDocs['drama']._id],
        genreSlugs: ['biography', 'drama'],
        censorRating: CensorRating.A,
        availableFormats: [MovieFormat.TWO_D, MovieFormat.IMAX_2D],
        releaseDate: new Date('2023-07-21'),
        posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=600',
        backdropUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=1200',
        trailerUrl: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
        cast: [{ name: 'Cillian Murphy', role: 'ACTOR', character: 'J. Robert Oppenheimer' }, { name: 'Emily Blunt', role: 'ACTOR', character: 'Katherine Oppenheimer' }],
        crew: [{ name: 'Christopher Nolan', role: 'Director' }],
        status: MovieStatus.NOW_SHOWING
      },
      {
        title: 'Jawan',
        slug: 'jawan',
        synopsis: 'A high-octane action thriller outlining the emotional journey of a man who is set out to rectify the wrongs in the society.',
        durationMins: 169,
        originalLanguageId: languageDocs.hi._id,
        languageIds: [languageDocs.hi._id, languageDocs.ta._id, languageDocs.te._id],
        genreIds: [genreDocs['action']._id, genreDocs['thriller']._id],
        genreSlugs: ['action', 'thriller'],
        censorRating: CensorRating.UA,
        availableFormats: [MovieFormat.TWO_D, MovieFormat.IMAX_2D],
        releaseDate: new Date('2023-09-07'),
        posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600',
        backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200',
        trailerUrl: 'https://www.youtube.com/watch?v=MWOlnZSnXWE',
        cast: [{ name: 'Shah Rukh Khan', role: 'ACTOR', character: 'Vikram Rathore' }, { name: 'Nayanthara', role: 'ACTOR', character: 'Narmada Rai' }],
        crew: [{ name: 'Atlee', role: 'Director' }],
        status: MovieStatus.NOW_SHOWING
      }
    ];

    // Drop obsolete multikey compound index if present in existing database
    try {
      await Movie.collection.dropIndex('status_1_genreSlugs_1_availableFormats_1');
    } catch (_ignore) {
      // Index did not exist or already dropped
    }

    const seededMovies = [];
    for (const m of moviesData) {
      let movie = await Movie.findOne({ slug: m.slug });
      if (!movie) {
        movie = await Movie.create(m);
        logger.info(`Provisioned Movie: ${movie.title}`);
      } else {
        await Movie.updateOne({ _id: movie._id }, { $set: { status: MovieStatus.NOW_SHOWING, isDeleted: false } });
      }
      seededMovies.push(movie);
    }

    // ─── 11. Scheduled Shows & Tiered Pricing ────────────────────────────────────
    const duneMovie = seededMovies[0];
    const oppenheimerMovie = seededMovies[1];

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const todayEvening = new Date();
    todayEvening.setHours(18, 30, 0, 0); // 06:30 PM today
    const todayNight = new Date();
    todayNight.setHours(21, 45, 0, 0); // 09:45 PM today

    const showsToSeed = [
      { movie: duneMovie, startTime: todayEvening, duration: 166 },
      { movie: oppenheimerMovie, startTime: todayNight, duration: 180 }
    ];

    for (const item of showsToSeed) {
      const endTime = new Date(item.startTime.getTime() + item.duration * 60000);
      const occupiedEndTime = new Date(endTime.getTime() + 20 * 60000); // 20m cleanup buffer
      const existingShow = await Show.findOne({
        screenId: screen._id,
        movieId: item.movie._id,
        startTime: item.startTime
      });

      if (!existingShow) {
        const pricingTiers = [
          {
            categoryCode: 'VIP',
            categoryName: 'VIP Recliner',
            basePrice: 500,
            convenienceFee: 30,
            taxPercent: 18,
            effectivePrice: 500 + 30 + Math.round((500 * 18) / 100)
          },
          {
            categoryCode: 'PREMIUM',
            categoryName: 'Premium Central',
            basePrice: 350,
            convenienceFee: 25,
            taxPercent: 18,
            effectivePrice: 350 + 25 + Math.round((350 * 18) / 100)
          },
          {
            categoryCode: 'EXECUTIVE',
            categoryName: 'Executive Standard',
            basePrice: 250,
            convenienceFee: 20,
            taxPercent: 18,
            effectivePrice: 250 + 20 + Math.round((250 * 18) / 100)
          }
        ];

        const show = await Show.create({
          theatreId: theatre._id,
          screenId: screen._id,
          partnerId: partnerEntity._id,
          movieId: item.movie._id,
          cityId: mumbaiCity._id,
          movieSnapshot: {
            title: item.movie.title,
            posterUrl: item.movie.posterUrl,
            durationMins: item.movie.durationMins,
            censorRating: item.movie.censorRating
          },
          showDate: todayDate,
          startTime: item.startTime,
          endTime,
          occupiedEndTime,
          format: ShowFormat.IMAX_2D,
          language: 'English',
          status: ShowStatus.PUBLISHED,
          layoutId: layout._id,
          layoutVersion: 1,
          totalSeats: 50,
          availableSeats: 50,
          pricingTiers,
          createdBy: ownerUser._id
        });

        // Seed ShowPricing records
        for (const pt of pricingTiers) {
          await ShowPricing.create({
            showId: show._id,
            screenId: screen._id,
            partnerId: partnerEntity._id,
            categoryCode: pt.categoryCode,
            categoryName: pt.categoryName,
            basePrice: pt.basePrice,
            convenienceFee: pt.convenienceFee,
            taxPercent: pt.taxPercent,
            effectivePrice: pt.effectivePrice,
            createdBy: ownerUser._id
          });
        }

        logger.info(`Provisioned Show: ${item.movie.title} at ${item.startTime.toLocaleTimeString()}`);
      }
    }

    logger.info('================================================================');
    logger.info('✅ SUCCESS: Full Development Seed Data Provisioned Successfully!');
    logger.info('================================================================');
    logger.info('Credentials for local execution:');
    logger.info(`- Super Admin:     ${adminEmail} / SuperAdmin@Secure2026! (Console: :5175)`);
    logger.info(`- Theatre Partner: ${ownerEmail} / Owner@Secure2026! (Dashboard: :5174)`);
    logger.info(`- Customer:        ${customerEmail} / Customer@Secure2026! (Web App: :5173)`);
    logger.info('================================================================');
  } catch (error) {
    console.error('SEEDING ERROR DETAILS:', error);
    logger.error({ msg: 'Failed to seed development data', error: error.message, stack: error.stack });
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
  }
}

// Allow direct execution via CLI
if (process.argv[1]?.endsWith('seed-dev.js')) {
  seedDevelopmentData()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export default seedDevelopmentData;
