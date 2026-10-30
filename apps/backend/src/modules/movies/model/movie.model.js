import mongoose from 'mongoose';
import { MovieStatus, CensorRating, MovieFormat } from '../movie.constants.js';

const castMemberSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    name: {
      type: String,
      required: [true, 'Cast member name is required'],
      trim: true
    },
    role: {
      type: String,
      default: 'ACTOR'
    },
    character: {
      type: String,
      trim: true,
      default: ''
    },
    photoUrl: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const crewMemberSchema = new mongoose.Schema(
  {
    crewId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    name: {
      type: String,
      required: [true, 'Crew member name is required'],
      trim: true
    },
    role: {
      type: String,
      required: [true, 'Crew member role is required']
    },
    designation: {
      type: String,
      default: ''
    },
    photoUrl: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Movie title is required'],
      trim: true,
      minlength: [1, 'Movie title cannot be empty'],
      maxlength: [200, 'Movie title cannot exceed 200 characters']
    },
    originalTitle: {
      type: String,
      trim: true,
      default: null
    },
    slug: {
      type: String,
      required: [true, 'Movie slug is required'],
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format (lowercase hyphenated)']
    },
    synopsis: {
      type: String,
      required: [true, 'Movie synopsis is required'],
      trim: true,
      minlength: [10, 'Synopsis must be at least 10 characters long'],
      maxlength: [5000, 'Synopsis cannot exceed 5000 characters']
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
      default: ''
    },
    durationMins: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [600, 'Duration cannot exceed 600 minutes']
    },
    releaseDate: {
      type: Date,
      required: [true, 'Release date is required']
    },
    endDate: {
      type: Date,
      default: null
    },
    censorRating: {
      type: String,
      enum: Object.values(CensorRating),
      required: [true, 'Censor rating is required']
    },
    productionCountry: {
      type: String,
      trim: true,
      default: 'India'
    },
    originalLanguageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'languages',
      default: null
    },
    genreIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'genres',
        required: true
      }
    ],
    genreSlugs: [
      {
        type: String,
        lowercase: true,
        trim: true
      }
    ],
    languageIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'languages',
        required: true
      }
    ],
    availableFormats: [
      {
        type: String,
        enum: Object.values(MovieFormat)
      }
    ],
    cast: {
      type: [castMemberSchema],
      default: []
    },
    crew: {
      type: [crewMemberSchema],
      default: []
    },
    posterUrl: {
      type: String,
      required: [true, 'Poster image URL is required'],
      trim: true
    },
    bannerUrl: {
      type: String,
      trim: true,
      default: ''
    },
    backdropUrl: {
      type: String,
      trim: true,
      default: ''
    },
    trailerUrl: {
      type: String,
      trim: true,
      default: ''
    },
    galleryImages: [
      {
        type: String,
        trim: true
      }
    ],
    status: {
      type: String,
      enum: Object.values(MovieStatus),
      default: MovieStatus.DRAFT,
      required: true
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null
    },
    avgRating: {
      type: Number,
      default: 0.0,
      min: 0.0,
      max: 10.0
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
movieSchema.index({ slug: 1 }, { unique: true });
movieSchema.index({ status: 1, releaseDate: -1, avgRating: -1 });
movieSchema.index({ status: 1, genreSlugs: 1, availableFormats: 1 });
movieSchema.index({ isDeleted: 1, deletedAt: 1 });
movieSchema.index(
  {
    title: 'text',
    'cast.name': 'text',
    'crew.name': 'text'
  },
  {
    weights: {
      title: 10,
      'cast.name': 5,
      'crew.name': 3
    },
    name: 'MovieTextIndex'
  }
);

export const Movie = mongoose.model('movies', movieSchema);
export default Movie;

