import mongoose from 'mongoose';
import { TheatreStatus, TheatreAmenities, OperatingDays } from '../theatre.constants.js';

const addressSubSchema = new mongoose.Schema(
  {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [300, 'Street address cannot exceed 300 characters']
    },
    landmark: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Landmark cannot exceed 200 characters']
    },
    area: {
      type: String,
      required: [true, 'Locality or area name is required'],
      trim: true,
      maxlength: [100, 'Area cannot exceed 100 characters']
    },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'cities',
      required: [true, 'City reference is required']
    },
    cityName: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters']
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Postal pincode is required'],
      trim: true,
      match: [/^\d{6}$/, 'Indian pincode must be exactly 6 digits']
    }
  },
  { _id: false }
);

const operatingHoursSubSchema = new mongoose.Schema(
  {
    openingTime: {
      type: String,
      default: '09:00',
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM (24-hour) format']
    },
    closingTime: {
      type: String,
      default: '23:59',
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM (24-hour) format']
    },
    operatingDays: {
      type: [String],
      enum: Object.values(OperatingDays),
      default: Object.values(OperatingDays)
    }
  },
  { _id: false }
);

const mediaSubSchema = new mongoose.Schema(
  {
    logoUrl: {
      type: String,
      trim: true,
      default: ''
    },
    posterUrl: {
      type: String,
      trim: true,
      default: ''
    },
    exteriorImages: {
      type: [String],
      default: []
    },
    interiorImages: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const businessDetailsSubSchema = new mongoose.Schema(
  {
    legalName: {
      type: String,
      trim: true,
      default: ''
    },
    gstin: {
      type: String,
      trim: true,
      default: ''
    },
    businessRegistrationNumber: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const theatreSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatre_partners',
      required: [true, 'Theatre Partner (tenant ID) reference is required']
    },
    name: {
      type: String,
      required: [true, 'Theatre name is required'],
      trim: true,
      minlength: [2, 'Theatre name must be at least 2 characters long'],
      maxlength: [200, 'Theatre name cannot exceed 200 characters']
    },
    slug: {
      type: String,
      required: [true, 'Theatre slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lower-case alphanumeric with hyphens']
    },
    theatreCode: {
      type: String,
      trim: true,
      default: '',
      uppercase: true
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    status: {
      type: String,
      enum: Object.values(TheatreStatus),
      default: TheatreStatus.PENDING_APPROVAL,
      required: true
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid contact email address']
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true
    },
    websiteUrl: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: addressSubSchema,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Location coordinates [lng, lat] are required'],
        default: [0, 0]
      }
    },
    googleMapsUrl: {
      type: String,
      trim: true,
      default: ''
    },
    businessDetails: {
      type: businessDetailsSubSchema,
      default: () => ({})
    },
    media: {
      type: mediaSubSchema,
      default: () => ({})
    },
    operatingHours: {
      type: operatingHoursSubSchema,
      default: () => ({})
    },
    amenities: {
      type: [String],
      enum: Object.values(TheatreAmenities),
      default: []
    },
    totalScreens: {
      type: Number,
      default: 0,
      min: 0
    },
    isBranch: {
      type: Boolean,
      default: true
    },
    parentTheatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatres',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isSuspended: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null
    },
    approvedAt: {
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
theatreSchema.index({ partnerId: 1, isDeleted: 1 });
theatreSchema.index({ status: 1, isActive: 1, isDeleted: 1 });
theatreSchema.index({ 'address.cityId': 1, status: 1, isDeleted: 1 });
theatreSchema.index({ location: '2dsphere' });
theatreSchema.index(
  {
    name: 'text',
    'address.area': 'text',
    'address.street': 'text'
  },
  {
    weights: {
      name: 10,
      'address.area': 5,
      'address.street': 1
    },
    name: 'idx_theatre_text_search'
  }
);

export const Theatre = mongoose.model('theatres', theatreSchema);
export default Theatre;
