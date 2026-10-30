export const ShowStatus = Object.freeze({
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  DELAYED: 'DELAYED'
});

export const ShowFormat = Object.freeze({
  TWO_D: '2D',
  THREE_D: '3D',
  IMAX_2D: 'IMAX_2D',
  IMAX_3D: 'IMAX_3D',
  FOUR_DX: '4DX'
});

export const ShowType = Object.freeze({
  REGULAR: 'REGULAR',
  PREMIERE: 'PREMIERE',
  SPECIAL_EVENT: 'SPECIAL_EVENT',
  MIDNIGHT_SCREENING: 'MIDNIGHT_SCREENING'
});

export const AudioFormat = Object.freeze({
  DOLBY_7_1: 'Dolby 7.1',
  DOLBY_ATMOS: 'Dolby Atmos',
  IMAX_12_CHANNEL: 'IMAX 12-Channel',
  DTS: 'DTS:X',
  OTHER: 'Standard Stereo'
});

export const DefaultCleanupBufferMinutes = 20;
export const DefaultTimezone = 'Asia/Kolkata';

export const ShowSortFields = Object.freeze({
  START_TIME: 'startTime',
  SHOW_DATE: 'showDate',
  STATUS: 'status',
  CREATED_AT: 'createdAt'
});

export const AllowedStatusTransitions = Object.freeze({
  [ShowStatus.DRAFT]: [ShowStatus.SCHEDULED, ShowStatus.PUBLISHED, ShowStatus.CANCELLED],
  [ShowStatus.SCHEDULED]: [ShowStatus.PUBLISHED, ShowStatus.CANCELLED, ShowStatus.DRAFT],
  [ShowStatus.PUBLISHED]: [ShowStatus.COMPLETED, ShowStatus.CANCELLED, ShowStatus.DELAYED],
  [ShowStatus.DELAYED]: [ShowStatus.PUBLISHED, ShowStatus.CANCELLED],
  [ShowStatus.CANCELLED]: [],
  [ShowStatus.COMPLETED]: []
});

export const PublicVisibleShowStatuses = Object.freeze([ShowStatus.PUBLISHED]);

export default {
  ShowStatus,
  ShowFormat,
  ShowType,
  AudioFormat,
  DefaultCleanupBufferMinutes,
  DefaultTimezone,
  ShowSortFields,
  AllowedStatusTransitions,
  PublicVisibleShowStatuses
};
