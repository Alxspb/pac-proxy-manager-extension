import '@testing-library/jest-dom'
import { vi } from 'vitest'

const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn()
    },
    onChanged: {
      addListener: vi.fn()
    }
  },
  proxy: {
    settings: {
      set: vi.fn(),
      get: vi.fn(),
      clear: vi.fn()
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    },
    onInstalled: {
      addListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn()
  },
  i18n: {
    getMessage: vi.fn((key) => key)
  }
}

global.chrome = mockChrome

beforeEach(() => {
  vi.clearAllMocks()
})
