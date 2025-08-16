import { vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Load real locale files instead of hardcoding translations
const loadLocaleMessages = (locale = 'en') => {
  try {
    const localeFilePath = path.resolve(process.cwd(), `_locales/${locale}/messages.json`);
    const localeData = JSON.parse(fs.readFileSync(localeFilePath, 'utf8'));
    const messages = {};
    
    // Convert Chrome i18n format to simple key-value pairs
    Object.keys(localeData).forEach(key => {
      messages[key] = localeData[key].message;
    });
    
    return messages;
  } catch (error) {
    console.warn(`Failed to load locale ${locale}:`, error.message);
    return {};
  }
};

const localeMessages = loadLocaleMessages('en');

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
      // Use real locale messages instead of hardcoded translations
      return localeMessages[key] || key;
    })
  }
});
