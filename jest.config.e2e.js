// jest.config.e2e.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Look for test files specifically in the 'e2e' directory
  testMatch: [
    '<rootDir>/e2e/**/*.test.ts',
  ],
  // Keep your moduleNameMapper for '@/' aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', 'tsconfig.jest.json']
  },
  // Set a higher timeout for E2E tests as they involve network requests
  testTimeout: 20000, // 20 seconds
};