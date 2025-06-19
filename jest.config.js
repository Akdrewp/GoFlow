// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // 'node' is good for backend/API logic testing
  // If your imports use '@/...' aliases, you'll need to configure moduleNameMapper
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Optionally, you can specify where Jest should look for tests
  testMatch: [
    '<rootDir>/src/**/*.test.ts', // Looks for .test.ts files inside src
  ],
  // Setup file for global mocks or configurations
  setupFilesAfterEnv: [], // We'll add this later if needed for global Firebase mocks
};