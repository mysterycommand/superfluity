module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^.+\\.s?css$': 'identity-obj-proxy',
  },
  preset: 'ts-jest',
  testMatch: ['<rootDir>/src/**/?(*.)test?(s).ts'],
};
