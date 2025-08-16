import { vi } from 'vitest';

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
        'cancel': 'Cancel',
        'pacScriptsTitle': 'PAC scripts',
        'addPacScript': 'Add PAC script',
        'noPacScripts': 'No PAC scripts configured',
        'configurePacScripts': 'Configure PAC scripts to manage proxy settings',
        'pacScriptName': 'Script Name',
        'pacScriptNamePlaceholder': 'My PAC script',
        'pacScriptUrl': 'PAC script URL',
        'pacScriptUrlPlaceholder': 'http://example.com/proxy.pac',
        'pacScriptContent': 'PAC script Content',
        'pacScriptContentPlaceholder': 'function FindProxyForURL(url, host) {\n    // Your PAC script logic here\n    return "DIRECT";\n}',
        'inputTypeUrl': 'URL',
        'inputTypePlain': 'Plain',
        'inputTypeLabel': 'Input Type',
        'enabled': 'Enabled',
        'disabled': 'Disabled',
        'fetchingPacScript': 'Loading...',
        'invalidPacScriptName': 'Script name is required',
        'invalidPacScriptUrl': 'Please enter a valid URL',
        'invalidPacScriptContent': 'Script content is required',
        'duplicatePacScriptName': 'A script with this name already exists',
        'fetchPacScriptError': 'Failed to fetch PAC script. Please check the URL and try again.',
        'pacScriptTypePlain': 'plain',
        'pacScriptTypeUrl': 'url',
        'reloadScript': 'Reload from URL',
        'reloadingScript': 'Reloading...',
        'reloadSuccess': 'Script reloaded successfully',
        'reloadError': 'Failed to reload script from URL',
        'confirmDelete': 'Are you sure you want to delete this proxy?',
        'confirmDeleteTitle': 'Delete Proxy'
      };
      return translations[key] || key;
    })
  }
});
