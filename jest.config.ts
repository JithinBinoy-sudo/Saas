import type { Config } from 'jest'
import nextJest from 'next/jest.js'

// next/jest handles .env loading, SWC transforms, and module aliases
const createJestConfig = nextJest({
  dir: './',
})

const customConfig: Config = {
  testEnvironment: 'jsdom',
  // setupFilesAfterEnv runs after the test framework is installed in the environment
  // (this is the equivalent of "setupFilesAfterFramework" in the task description)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(customConfig)
