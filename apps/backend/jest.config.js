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
      branches: 40,
      functions: 50,
      lines: 60,
      statements: 60
    }
  },
  verbose: true,
  testTimeout: 10000
};
