export const MovieStatus = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  UPCOMING: 'UPCOMING',
  NOW_SHOWING: 'NOW_SHOWING',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
  REJECTED: 'REJECTED'
});

export const PublicVisibleStatuses = Object.freeze([
  MovieStatus.APPROVED,
  MovieStatus.UPCOMING,
  MovieStatus.NOW_SHOWING
]);

export const CensorRating = Object.freeze({
  U: 'U',
  UA: 'UA',
  UA_13_PLUS: 'UA_13_PLUS',
  UA_16_PLUS: 'UA_16_PLUS',
  A: 'A',
  S: 'S'
});

export const MovieFormat = Object.freeze({
  TWO_D: '2D',
  THREE_D: '3D',
  IMAX_2D: 'IMAX_2D',
  IMAX_3D: 'IMAX_3D',
  FOUR_DX: '4DX',
  ICE: 'ICE',
  DOLBY_CINEMA: 'DOLBY_CINEMA'
});

export const MediaCategory = Object.freeze({
  POSTER: 'poster',
  BANNER: 'banner',
  BACKDROP: 'backdrop',
  TRAILER: 'trailer',
  GALLERY: 'gallery',
  CAST_PROFILE: 'cast_profile'
});

export const CastRole = Object.freeze({
  LEAD_ACTOR: 'LEAD_ACTOR',
  ACTOR: 'ACTOR',
  SUPPORTING_ACTOR: 'SUPPORTING_ACTOR',
  SPECIAL_APPEARANCE: 'SPECIAL_APPEARANCE'
});

export const CrewRole = Object.freeze({
  DIRECTOR: 'DIRECTOR',
  PRODUCER: 'PRODUCER',
  WRITER: 'WRITER',
  MUSIC_DIRECTOR: 'MUSIC_DIRECTOR',
  CINEMATOGRAPHER: 'CINEMATOGRAPHER',
  EDITOR: 'EDITOR'
});

export const MovieSortFields = Object.freeze({
  TITLE: 'title',
  RELEASE_DATE: 'releaseDate',
  RATING: 'avgRating',
  CREATED_AT: 'createdAt',
  DURATION: 'durationMins'
});

export default {
  MovieStatus,
  PublicVisibleStatuses,
  CensorRating,
  MovieFormat,
  MediaCategory,
  CastRole,
  CrewRole,
  MovieSortFields
};
