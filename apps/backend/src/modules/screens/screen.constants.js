export const ScreenType = Object.freeze({
  STANDARD: 'STANDARD',
  IMAX: 'IMAX',
  DOLBY_ATMOS: 'DOLBY_ATMOS',
  FOUR_DX: '4DX',
  PREMIUM: 'PREMIUM',
  OTHER: 'OTHER'
});

export const ScreenStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION'
});

export const SeatType = Object.freeze({
  NORMAL: 'NORMAL',
  RECLINER: 'RECLINER',
  SOFA: 'SOFA',
  WHEELCHAIR: 'WHEELCHAIR',
  COMPANION: 'COMPANION',
  OTHER: 'OTHER'
});

export const SeatStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
  MAINTENANCE: 'MAINTENANCE'
});

export const LayoutStatus = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  DEPRECATED: 'DEPRECATED'
});

export const DefaultSeatCategories = Object.freeze([
  {
    name: 'Regular',
    code: 'REGULAR',
    description: 'Standard comfortable cinema seating',
    displayColor: '#3B82F6',
    basePrice: 150,
    sortOrder: 4
  },
  {
    name: 'Executive',
    code: 'EXECUTIVE',
    description: 'Enhanced legroom executive seating',
    displayColor: '#10B981',
    basePrice: 200,
    sortOrder: 3
  },
  {
    name: 'Premium',
    code: 'PREMIUM',
    description: 'Optimal prime viewing tier',
    displayColor: '#F59E0B',
    basePrice: 250,
    sortOrder: 2
  },
  {
    name: 'VIP Recliner',
    code: 'RECLINER',
    description: 'Motorized plush leather recliners',
    displayColor: '#8B5CF6',
    basePrice: 450,
    sortOrder: 1
  },
  {
    name: 'Wheelchair Bay',
    code: 'WHEELCHAIR',
    description: 'Dedicated barrier-free accessible spaces',
    displayColor: '#06B6D4',
    basePrice: 150,
    sortOrder: 5
  }
]);

export const ScreenSortFields = Object.freeze({
  NAME: 'name',
  SCREEN_NUMBER: 'screenNumber',
  TOTAL_SEATS: 'totalSeats',
  CREATED_AT: 'createdAt'
});

export default {
  ScreenType,
  ScreenStatus,
  SeatType,
  SeatStatus,
  LayoutStatus,
  DefaultSeatCategories,
  ScreenSortFields
};

