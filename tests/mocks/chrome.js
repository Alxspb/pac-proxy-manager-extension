import { vi } from 'vitest'

export const createMockChrome = () => ({
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve())
    },
    onChanged: {
      addListener: vi.fn()
    }
  },
  proxy: {
    settings: {
      set: vi.fn(() => Promise.resolve()),
      get: vi.fn(() => Promise.resolve({ value: { mode: 'direct' } })),
      clear: vi.fn(() => Promise.resolve())
    }
  },
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve({ isActive: false })),
    onMessage: {
      addListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([{
      url: 'https://example.com',
      active: true
    }]))
  },
  i18n: {
    getMessage: vi.fn((key) => {
      const translations = {
        'proxyStatus': 'Proxy Status',
        'activateProxy': 'Activate Proxy',
        'deactivateProxy': 'Deactivate Proxy',
        'proxyActive': 'Proxy is Active',
        'proxyInactive': 'Proxy is Inactive',
        'addProxy': 'Add Proxy',
        'proxyUrl': 'Proxy URL',
        'invalidUrlFormat': 'Invalid URL format',
        'noProxyServers': 'No proxy servers configured',
        'configureProxyServers': 'Configure proxy servers to activate proxy',
        'proxiesTitle': 'Proxy Servers',
        'save': 'Save',
        'cancel': 'Cancel'
      }
      return translations[key] || key
    })
  }
})
