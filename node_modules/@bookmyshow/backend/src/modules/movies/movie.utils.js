import { MovieStatus } from './movie.constants.js';

/**
 * Generate a URL-safe lowercase slug from any text
 */
export const slugify = text => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word characters (except spaces & hyphens)
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with a single hyphen
    .replace(/^-+|-+$/g, ''); // Strip leading or trailing hyphens
};

/**
 * Generate unique slug with numeric suffix if necessary
 */
export const generateUniqueSlug = async (title, checkExistsFn) => {
  const baseSlug = slugify(title) || 'movie';
  let candidateSlug = baseSlug;
  let counter = 1;

  while (await checkExistsFn(candidateSlug)) {
    candidateSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return candidateSlug;
};

/**
 * Valid Status Transitions Matrix
 */
const VALID_TRANSITIONS = {
  [MovieStatus.DRAFT]: [MovieStatus.PENDING_APPROVAL, MovieStatus.ARCHIVED],
  [MovieStatus.PENDING_APPROVAL]: [MovieStatus.APPROVED, MovieStatus.REJECTED, MovieStatus.DRAFT],
  [MovieStatus.APPROVED]: [MovieStatus.UPCOMING, MovieStatus.NOW_SHOWING, MovieStatus.ARCHIVED],
  [MovieStatus.UPCOMING]: [MovieStatus.NOW_SHOWING, MovieStatus.ARCHIVED],
  [MovieStatus.NOW_SHOWING]: [MovieStatus.COMPLETED, MovieStatus.ARCHIVED],
  [MovieStatus.COMPLETED]: [MovieStatus.ARCHIVED, MovieStatus.NOW_SHOWING],
  [MovieStatus.REJECTED]: [MovieStatus.DRAFT, MovieStatus.ARCHIVED],
  [MovieStatus.ARCHIVED]: [MovieStatus.DRAFT]
};

/**
 * Verify whether transitioning from currentStatus to targetStatus is permitted
 */
export const isAllowedStatusTransition = (currentStatus, targetStatus) => {
  if (currentStatus === targetStatus) {
    return true;
  }
  const allowedNext = VALID_TRANSITIONS[currentStatus];
  return Boolean(allowedNext && allowedNext.includes(targetStatus));
};

/**
 * Derive operational status based on theatrical window and release date
 */
export const deriveTheatricalStatus = ({ status, releaseDate, endDate }) => {
  if (![MovieStatus.APPROVED, MovieStatus.UPCOMING, MovieStatus.NOW_SHOWING].includes(status)) {
    return status;
  }

  const now = new Date();
  const relDate = new Date(releaseDate);
  const eDate = endDate ? new Date(endDate) : null;

  if (now < relDate) {
    return MovieStatus.UPCOMING;
  }
  if (eDate && now > eDate) {
    return MovieStatus.COMPLETED;
  }
  return MovieStatus.NOW_SHOWING;
};

export default {
  slugify,
  generateUniqueSlug,
  isAllowedStatusTransition,
  deriveTheatricalStatus
};
