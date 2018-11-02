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
  testMatch: ['<rootDir>/src/**/?(*.)test?(s).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
