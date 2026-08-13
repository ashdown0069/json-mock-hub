import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  transformIgnorePatterns: ['/node_modules/(?!(nanoid|next-intl|use-intl)/)'],
  // Add more setup options before each test is run
  setupFiles: ['<rootDir>/jest.polyfill.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^nanoid$': '<rootDir>/../../node_modules/nanoid/index.cjs',
    '^@/(.*)$': '<rootDir>/$1',
    '^@workspace/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@workspace/codegen$': '<rootDir>/../../packages/codegen/src/index.ts',
    '^@workspace/mockgen/(.*)$': '<rootDir>/../../packages/mockgen/src/$1.ts',
    '^@workspace/mockgen$': '<rootDir>/../../packages/mockgen/src/index.ts',
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    'hooks/**/*.ts',
    'features/**/{api,store,utils,lib,schema,hooks,actions}/**/*.{ts,tsx}',
    'features/workspace/components/CreateWorkspaceDialog/CreateWorkspaceSchema.ts',
    '!**/__test__/**',
    '!**/*.d.ts',
    '!lib/axios.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

export default async function () {
  const makeConfig = createJestConfig(config)
  const finalConfig = await makeConfig()
  finalConfig.transformIgnorePatterns = [
    '/node_modules/(?!(nanoid|next-intl|use-intl|@formatjs|@intl|intl-messageformat)/)',
  ]
  return finalConfig
}
