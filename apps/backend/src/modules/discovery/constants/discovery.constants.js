/**
 * Discovery Module Constants
 * Defines ranking weights, similarity coefficients, recommendation scoring,
 * cache keys, TTLs, and pagination limits for the Discovery Engine.
 */

export const DiscoverySortFields = Object.freeze({
  RELEVANCE: 'relevance',
  RELEASE_DATE: 'releaseDate',
  RATING: 'avgRating',
  TITLE: 'title',
  POPULARITY: 'popularity',
  START_TIME: 'startTime',
  CREATED_AT: 'createdAt',
  DURATION: 'durationMins'
});

export const DiscoveryRecommendationTypes = Object.freeze({
  FOR_YOU: 'for_you',
  SIMILAR_GENRE: 'similar_genre',
  SIMILAR_LANGUAGE: 'similar_language',
  POPULAR_NEAR_YOU: 'popular_near_you',
  BECAUSE_YOU_WATCHED: 'because_you_watched'
});

export const SuggestionTypes = Object.freeze({
  MOVIE: 'MOVIE',
  ACTOR: 'ACTOR',
  DIRECTOR: 'DIRECTOR',
  GENRE: 'GENRE',
  THEATRE: 'THEATRE',
  CITY: 'CITY'
});

export const DiscoveryCacheKeys = Object.freeze({
  TRENDING_PREFIX: 'discovery:trending:',
  POPULAR_PREFIX: 'discovery:popular:',
  UPCOMING_PREFIX: 'discovery:upcoming:',
  NOW_SHOWING_PREFIX: 'discovery:now_showing:',
  SUGGESTIONS_PREFIX: 'discovery:suggestions:',
  SIMILAR_PREFIX: 'discovery:similar:',
  THEATRES_PREFIX: 'discovery:theatres:',
  SHOWS_PREFIX: 'discovery:shows:',
  RECOMMENDATIONS_PREFIX: 'discovery:recommendations:'
});

export const DiscoveryTTLs = Object.freeze({
  TRENDING_SECONDS: 900, // 15 mins
  POPULAR_SECONDS: 3600, // 1 hour
  UPCOMING_SECONDS: 1800, // 30 mins
  NOW_SHOWING_SECONDS: 600, // 10 mins
  SUGGESTIONS_SECONDS: 900, // 15 mins
  SIMILAR_SECONDS: 3600, // 1 hour
  THEATRES_SECONDS: 1800, // 30 mins
  SHOWS_SECONDS: 300, // 5 mins
  RECOMMENDATIONS_SECONDS: 600 // 10 mins
});

export const DiscoveryDefaults = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
  SUGGESTION_LIMIT: 10,
  RECENTLY_VIEWED_LIMIT: 50,
  DEFAULT_GEO_RADIUS_KM: 15,
  MAX_GEO_RADIUS_KM: 100,
  TRENDING_WINDOW_HOURS: 48,
  POPULAR_WINDOW_DAYS: 30,
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_LENGTH: 100
});

export const RankingWeights = Object.freeze({
  TEXT_RELEVANCE: 0.35,
  POPULARITY: 0.25,
  SHOW_AVAILABILITY: 0.2,
  RATING: 0.1,
  RECENCY: 0.1
});

export const SimilarityWeights = Object.freeze({
  GENRE_OVERLAP: 0.4,
  LANGUAGE_MATCH: 0.25,
  CAST_OVERLAP: 0.2,
  DIRECTOR_MATCH: 0.15
});

export const RecommendationScores = Object.freeze({
  GENRE_MATCH: 30,
  LANGUAGE_MATCH: 20,
  DIRECTOR_MATCH: 15,
  ACTOR_MATCH: 10,
  SHOW_AVAILABLE_IN_CITY: 25,
  RATING_MAX_POINTS: 10
});

export default {
  DiscoverySortFields,
  DiscoveryRecommendationTypes,
  SuggestionTypes,
  DiscoveryCacheKeys,
  DiscoveryTTLs,
  DiscoveryDefaults,
  RankingWeights,
  SimilarityWeights,
  RecommendationScores
};

