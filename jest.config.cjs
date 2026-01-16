module.exports = {
  projects: [
    {
      displayName: 'main',
      testEnvironment: 'node',
      testMatch: ['**/src/main/**/*.test.js'],
      transform: {
        '^.+\\.js$': ['babel-jest', {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }]
          ]
        }]
      },
      transformIgnorePatterns: [
        'node_modules/(?!(music-metadata|strtok3|token-types|peek-readable|file-type)/)'
      ],
      collectCoverageFrom: [
        'src/main/**/*.js',
        '!src/main/**/*.test.js'
      ]
    },
    {
      displayName: 'renderer',
      testEnvironment: 'jsdom',
      testMatch: ['**/src/renderer/**/*.test.{js,jsx}'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      transform: {
        '^.+\\.(js|jsx)$': ['babel-jest', {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
            ['@babel/preset-react', { runtime: 'automatic' }]
          ]
        }]
      },
      collectCoverageFrom: [
        'src/renderer/**/*.{js,jsx}',
        '!src/renderer/**/*.test.{js,jsx}'
      ]
    }
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
