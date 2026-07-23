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
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
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
    '!lib/auth.ts',
    '!features/mock-api/lib/shiki.ts',
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

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
