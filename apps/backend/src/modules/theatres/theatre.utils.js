import { AllowedTheatreStatusTransitions } from './theatre.constants.js';

/**
 * Convert string into a URL-friendly slug
 */
export const slugify = text => {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Generate a unique slug for a theatre, avoiding collisions by appending sequential numeric suffixes
 */
export const generateUniqueTheatreSlug = async (name, cityName = '', theatreModel) => {
  const basePart = cityName ? `${name} ${cityName}` : name;
  const baseSlug = slugify(basePart);
  let candidateSlug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await theatreModel.findOne({ slug: candidateSlug }).lean();
    if (!existing) {
      return candidateSlug;
    }
    counter += 1;
    candidateSlug = `${baseSlug}-${counter}`;
  }
};

/**
 * Validate status transition against the allowed state machine matrix
 */
export const isAllowedTheatreStatusTransition = (currentStatus, targetStatus) => {
  if (currentStatus === targetStatus) {
    return true;
  }
  const allowed = AllowedTheatreStatusTransitions[currentStatus] || [];
  return allowed.includes(targetStatus);
};

/**
 * Validate GeoJSON [longitude, latitude] coordinates
 */
export const validateCoordinates = coordinates => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  const [lng, lat] = coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return false;
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return false;
  }
  return true;
};

export default {
  slugify,
  generateUniqueTheatreSlug,
  isAllowedTheatreStatusTransition,
  validateCoordinates
};
