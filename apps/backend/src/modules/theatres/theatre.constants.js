export const TheatreStatus = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE'
});

export const PublicVisibleTheatreStatuses = Object.freeze([TheatreStatus.APPROVED]);

export const TheatreAmenities = Object.freeze({
  PARKING: 'PARKING',
  FOOD_BEVERAGES: 'FOOD_BEVERAGES',
  WHEELCHAIR_ACCESS: 'WHEELCHAIR_ACCESS',
  DOLBY_ATMOS: 'DOLBY_ATMOS',
  IMAX: 'IMAX',
  FOUR_DX: '4DX',
  RECLINERS: 'RECLINERS',
  M_TICKET: 'M_TICKET',
  AIR_CONDITIONED: 'AIR_CONDITIONED',
  SECURITY_CHECK: 'SECURITY_CHECK'
});

export const OperatingDays = Object.freeze({
  MON: 'MON',
  TUE: 'TUE',
  WED: 'WED',
  THU: 'THU',
  FRI: 'FRI',
  SAT: 'SAT',
  SUN: 'SUN'
});

export const AllowedTheatreStatusTransitions = Object.freeze({
  [TheatreStatus.DRAFT]: [TheatreStatus.PENDING_APPROVAL, TheatreStatus.INACTIVE],
  [TheatreStatus.PENDING_APPROVAL]: [
    TheatreStatus.UNDER_REVIEW,
    TheatreStatus.APPROVED,
    TheatreStatus.REJECTED,
    TheatreStatus.DRAFT
  ],
  [TheatreStatus.UNDER_REVIEW]: [
    TheatreStatus.APPROVED,
    TheatreStatus.REJECTED,
    TheatreStatus.PENDING_APPROVAL
  ],
  [TheatreStatus.APPROVED]: [TheatreStatus.SUSPENDED, TheatreStatus.INACTIVE],
  [TheatreStatus.REJECTED]: [TheatreStatus.DRAFT, TheatreStatus.PENDING_APPROVAL],
  [TheatreStatus.SUSPENDED]: [TheatreStatus.APPROVED, TheatreStatus.INACTIVE],
  [TheatreStatus.INACTIVE]: [
    TheatreStatus.DRAFT,
    TheatreStatus.PENDING_APPROVAL,
    TheatreStatus.APPROVED
  ]
});

export const TheatreSortFields = Object.freeze({
  NAME: 'name',
  CREATED_AT: 'createdAt',
  STATUS: 'status',
  TOTAL_SCREENS: 'totalScreens'
});

export default {
  TheatreStatus,
  PublicVisibleTheatreStatuses,
  TheatreAmenities,
  OperatingDays,
  AllowedTheatreStatusTransitions,
  TheatreSortFields
};

