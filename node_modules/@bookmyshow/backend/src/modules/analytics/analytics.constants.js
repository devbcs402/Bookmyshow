export const TimeRange = Object.freeze({
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: '7d',
  LAST_30_DAYS: '30d',
  THIS_MONTH: 'this_month',
  PREV_MONTH: 'prev_month',
  CUSTOM: 'custom'
});

export const AnalyticsCache = Object.freeze({
  TTL_SECONDS: 300, // 5 minutes
  PREFIX_ADMIN: 'analytics:admin',
  PREFIX_OWNER: 'analytics:owner'
});

export default {
  TimeRange,
  AnalyticsCache
};

