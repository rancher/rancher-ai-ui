module.exports = {
  testEnvironment:        'jsdom',
  testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] },
  watchman:               false,
  moduleFileExtensions:   ['js', 'ts', 'json', 'vue'],
  modulePaths:            ['<rootDir>'],
  moduleNameMapper:       {
    '^~/(.*)$':         '<rootDir>/$1',
    '^@/(.*)$':         '<rootDir>/$1',
    '@shell/(.*)':      '<rootDir>/node_modules/@rancher/shell/$1',
    '@components/(.*)': '<rootDir>/node_modules/@rancher/shell/rancher-components/$1',
    '\\.(jpe?g|png|gif|webp|svg|mp4|webm|ogg|mp3|wav|flac|aac|woff2?|eot|ttf|otf)$': '<rootDir>/utils/svgTransform.js',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/cypress/',
    '<rootDir>/scripts/',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
  ],
  transform:              {
    '^.+\\.vue$':  '@vue/vue3-jest',
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.svg$':  '<rootDir>/utils/svgTransform.js' // to mock `*.svg` files
  },
  // Allow transforming .vue files in node_modules/@rancher/shell
  transformIgnorePatterns: [
    '/node_modules/(?!@rancher/shell).+\\.js$'
  ],
  testMatch: [
    '**/__tests__/**/*.test.ts'
  ]
};