import mongoose from 'mongoose';

const languageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Language name is required'],
      trim: true,
      minlength: [2, 'Language name must be at least 2 characters'],
      maxlength: [50, 'Language name cannot exceed 50 characters']
    },
    code: {
      type: String,
      required: [true, 'Language ISO code is required'],
      lowercase: true,
      trim: true,
      minlength: [2, 'Language code must be 2 or 3 characters (ISO 639-1)'],
      maxlength: [3, 'Language code must be 2 or 3 characters (ISO 639-1)']
    },
    nativeName: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
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

languageSchema.index({ code: 1 }, { unique: true });
languageSchema.index({ name: 1 }, { unique: true });
languageSchema.index({ isActive: 1, deletedAt: 1 });

export const Language = mongoose.model('languages', languageSchema);
export default Language;
