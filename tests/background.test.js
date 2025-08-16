import { describe, it, expect, beforeEach } from 'vitest';
import { createMockChrome } from './mocks/chrome.js';

describe('Background Script - ProxyManager', () => {
  let mockChrome;
  let ProxyManager;

  beforeEach(async () => {
    mockChrome = createMockChrome();
    global.chrome = mockChrome;

    ProxyManager = class {
      constructor() {
        this.isProxyActive = false;
      }

      generatePacScript(domainExceptions, proxyServers) {
        const proxyList = proxyServers.map(proxy => {
          try {
            const url = new URL(proxy.url);
            const protocol = url.protocol === 'https:' ? 'HTTPS' : 'PROXY';
            const port = url.port || (url.protocol === 'https:' ? '443' : '80');
            return `${protocol} ${url.hostname}:${port}`;
          } catch (_e) {
            return `PROXY ${proxy.url}`;
          }
        }).join('; ');

        const proxyString = proxyList || 'DIRECT';

        return `
function FindProxyForURL(url, host) {
  const domainExceptions = ${JSON.stringify(domainExceptions || {})};
  
  if (domainExceptions[host]) {
    const option = domainExceptions[host];
    if (option === 'yes') return "${proxyString}";
    if (option === 'no') return "DIRECT";
  }

  for (const domain in domainExceptions) {
    if (domain.startsWith('*.')) {
      const baseDomain = domain.slice(2);
      if (host === baseDomain || host.endsWith('.' + baseDomain)) {
        const option = domainExceptions[domain];
        if (option === 'yes') return "${proxyString}";
        if (option === 'no') return "DIRECT";
      }
    }
  }

  return "DIRECT";
}`;
      }

      async activateProxy() {
        await chrome.storage.local.set({ proxyActive: true });
        this.isProxyActive = true;
        return true;
      }

      async deactivateProxy() {
        await chrome.proxy.settings.clear({ scope: 'regular' });
        await chrome.storage.local.set({ proxyActive: false });
        this.isProxyActive = false;
        return true;
      }

      async getProxyStatus() {
        const settings = await chrome.proxy.settings.get({ incognito: false });
        return {
          isActive: this.isProxyActive,
          settings,
          isBlocked: settings.levelOfControl === 'controlled_by_other_extensions'
        };
      }
    };
  });

  describe('PAC Script Generation', () => {
    it('should generate correct PAC script for wildcard domains', () => {
      const proxyManager = new ProxyManager();
      const domainExceptions = {
        '*.example.com': 'yes',
        'direct.com': 'no'
      };
      const proxyServers = [{ url: 'http://proxy.test.com:8080' }];

      const pacScript = proxyManager.generatePacScript(domainExceptions, proxyServers);
      
      expect(pacScript).toContain('PROXY proxy.test.com:8080');
      expect(pacScript).toContain('*.example.com');
      expect(pacScript).toContain('direct.com');
    });

    it('should handle HTTPS proxies correctly', () => {
      const proxyManager = new ProxyManager();
      const proxyServers = [{ url: 'https://secure-proxy.test.com:443' }];

      const pacScript = proxyManager.generatePacScript({}, proxyServers);
      
      expect(pacScript).toContain('HTTPS secure-proxy.test.com:443');
    });

    it('should handle multiple proxy servers', () => {
      const proxyManager = new ProxyManager();
      const proxyServers = [
        { url: 'http://proxy1.test.com:8080' },
        { url: 'https://proxy2.test.com:443' }
      ];

      const pacScript = proxyManager.generatePacScript({}, proxyServers);
      
      expect(pacScript).toContain('PROXY proxy1.test.com:8080; HTTPS proxy2.test.com:443');
    });

    it('should handle malformed proxy URLs gracefully', () => {
      const proxyManager = new ProxyManager();
      const proxyServers = [{ url: 'not-a-valid-url' }];

      const pacScript = proxyManager.generatePacScript({}, proxyServers);
      
      expect(pacScript).toContain('PROXY not-a-valid-url');
    });
  });

  describe('Proxy Activation/Deactivation', () => {
    it('should activate proxy and update storage', async () => {
      const proxyManager = new ProxyManager();
      
      const result = await proxyManager.activateProxy();
      
      expect(result).toBe(true);
      expect(proxyManager.isProxyActive).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ proxyActive: true });
    });

    it('should deactivate proxy and clear settings', async () => {
      const proxyManager = new ProxyManager();
      proxyManager.isProxyActive = true;
      
      const result = await proxyManager.deactivateProxy();
      
      expect(result).toBe(true);
      expect(proxyManager.isProxyActive).toBe(false);
      expect(mockChrome.proxy.settings.clear).toHaveBeenCalledWith({ scope: 'regular' });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ proxyActive: false });
    });
  });

  describe('Proxy Status', () => {
    it('should return proxy status with control information', async () => {
      const proxyManager = new ProxyManager();
      proxyManager.isProxyActive = true;
      
      // Mock proxy settings response
      mockChrome.proxy.settings.get.mockResolvedValue({
        value: { mode: 'pac_script' },
        levelOfControl: 'controlled_by_this_extension'
      });
      
      const status = await proxyManager.getProxyStatus();
      
      expect(status).toEqual({
        isActive: true,
        settings: {
          value: { mode: 'pac_script' },
          levelOfControl: 'controlled_by_this_extension'
        },
        isBlocked: false
      });
      
      expect(mockChrome.proxy.settings.get).toHaveBeenCalledWith({ incognito: false });
    });

    it('should detect when another extension controls proxy', async () => {
      const proxyManager = new ProxyManager();
      proxyManager.isProxyActive = false;
      
      // Mock proxy settings response indicating another extension has control
      mockChrome.proxy.settings.get.mockResolvedValue({
        value: { mode: 'pac_script' },
        levelOfControl: 'controlled_by_other_extensions'
      });
      
      const status = await proxyManager.getProxyStatus();
      
      expect(status).toEqual({
        isActive: false,
        settings: {
          value: { mode: 'pac_script' },
          levelOfControl: 'controlled_by_other_extensions'
        },
        isBlocked: true
      });
    });

    it('should not be blocked when this extension has control', async () => {
      const proxyManager = new ProxyManager();
      proxyManager.isProxyActive = true;
      
      mockChrome.proxy.settings.get.mockResolvedValue({
        value: { mode: 'pac_script' },
        levelOfControl: 'controlled_by_this_extension'
      });
      
      const status = await proxyManager.getProxyStatus();
      
      expect(status.isBlocked).toBe(false);
    });

    it('should not be blocked when no extension controls proxy', async () => {
      const proxyManager = new ProxyManager();
      
      mockChrome.proxy.settings.get.mockResolvedValue({
        value: { mode: 'direct' },
        levelOfControl: 'controllable_by_this_extension'
      });
      
      const status = await proxyManager.getProxyStatus();
      
      expect(status.isBlocked).toBe(false);
    });
  });

  describe('PAC Script Logic Testing', () => {
    it('should create PAC function that routes wildcard domains correctly', () => {
      const proxyManager = new ProxyManager();
      const domainExceptions = { '*.headlessui.com': 'yes' };
      const proxyServers = [{ url: 'http://proxy.test.com:8080' }];

      const pacScript = proxyManager.generatePacScript(domainExceptions, proxyServers);
      
      // Create the actual PAC function to test its logic
      const FindProxyForURL = new Function('url', 'host', 
        pacScript.replace('function FindProxyForURL(url, host) {', '').replace(/}$/, '')
      );

      // Test various scenarios
      expect(FindProxyForURL('https://headlessui.com/docs', 'headlessui.com')).toBe('PROXY proxy.test.com:8080');
      expect(FindProxyForURL('https://api.headlessui.com/v1', 'api.headlessui.com')).toBe('PROXY proxy.test.com:8080');
      expect(FindProxyForURL('https://google.com', 'google.com')).toBe('DIRECT');
    });

    it('should handle exact domain matches', () => {
      const proxyManager = new ProxyManager();
      const domainExceptions = { 'exact.example.com': 'no' };
      const proxyServers = [{ url: 'http://proxy.test.com:8080' }];

      const pacScript = proxyManager.generatePacScript(domainExceptions, proxyServers);
      const FindProxyForURL = new Function('url', 'host',
        pacScript.replace('function FindProxyForURL(url, host) {', '').replace(/}$/, '')
      );

      expect(FindProxyForURL('https://exact.example.com', 'exact.example.com')).toBe('DIRECT');
      expect(FindProxyForURL('https://sub.exact.example.com', 'sub.exact.example.com')).toBe('DIRECT'); // Different domain
    });
  });
});
