export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/docs/**',
    '!src/config/database.js',
    '!src/config/redis.js',
    '!src/scripts/**',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 60,
      lines: 65,
      statements: 65
    }
  },
  verbose: true,
  testTimeout: 10000
};
