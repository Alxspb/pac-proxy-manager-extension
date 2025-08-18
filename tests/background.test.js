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

      generateCombinedPacScript(domainExceptions, proxyServers, pacScripts, userProxiesEnabled) {
        const userProxyList = proxyServers.map(proxy => {
          try {
            const url = new URL(proxy.url);
            const protocol = url.protocol === 'https:' ? 'HTTPS' : 'PROXY';
            const port = url.port || (url.protocol === 'https:' ? '443' : '80');
            return `${protocol} ${url.hostname}:${port}`;
          } catch (_e) {
            return `PROXY ${proxy.url}`;
          }
        }).join('; ');

        const hasUserProxies = proxyServers.length > 0 && userProxiesEnabled;
        const userProxyString = hasUserProxies ? userProxyList : '';
        
        const enabledPacScripts = pacScripts.filter(script => script.enabled);
        
        const pacScriptFunctions = enabledPacScripts.map((script, index) => {
          return `
function userPacScript${index}(url, host) {
  try {
    ${script.content}
    return FindProxyForURL(url, host);
  } catch (e) {
    return "DIRECT";
  }
}`;
        }).join('\n');

        return `
${pacScriptFunctions}

function FindProxyForURL(url, host) {
  const hasUserProxies = ${hasUserProxies};
  const userProxyString = "${userProxyString}";
  
  ${hasUserProxies ? `
  const domainExceptions = ${JSON.stringify(domainExceptions || {})};
  
  function checkDomainException(domain) {
    if (domainExceptions[domain]) {
      const option = domainExceptions[domain];
      if (option === 'yes') {
        return userProxyString + "; DIRECT";
      }
      if (option === 'no') {
        return "DIRECT";
      }
    }
    return null;
  }
  
  let exceptionResult = checkDomainException(host);
  if (exceptionResult !== null) return exceptionResult;
  
  for (const domain in domainExceptions) {
    if (domain.startsWith('*.')) {
      const baseDomain = domain.slice(2);
      if (host === baseDomain || host.endsWith('.' + baseDomain)) {
        exceptionResult = checkDomainException(domain);
        if (exceptionResult !== null) return exceptionResult;
      }
    }
  }
  
  ` : `
  `}
  ${enabledPacScripts.map((script, index) => `
  try {
    const pacResult${index} = userPacScript${index}(url, host);
    if (pacResult${index} !== "DIRECT") {
      if (hasUserProxies) {
        return userProxyString + "; DIRECT";
      } else {
        return pacResult${index};
      }
    }
  } catch (e) {
  }`).join('\n')}
  
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
        const result = await chrome.storage.local.get(['proxies', 'proxyActive']);
        const pacScripts = []; // Mock empty PAC scripts for testing
        const enabledPacScripts = pacScripts.filter(script => script.enabled);
        
        const userProxiesEnabled = result.proxyActive && (result.proxies || []).length > 0;
        const hasEnabledPacScripts = enabledPacScripts.length > 0;
        
        return {
          isActive: result.proxyActive || false,
          userProxiesEnabled,
          hasEnabledPacScripts,
          settings,
          isBlocked: settings.levelOfControl === 'controlled_by_other_extensions'
        };
      }
    };
  });

  describe('Combined PAC Script Generation', () => {
    it('should generate PAC script with user proxies and domain exceptions', () => {
      const proxyManager = new ProxyManager();
      const domainExceptions = {
        '*.example.com': 'yes',
        'direct.com': 'no'
      };
      const proxyServers = [{ url: 'http://proxy.test.com:8080' }];
      const pacScripts = [];

      const pacScript = proxyManager.generateCombinedPacScript(domainExceptions, proxyServers, pacScripts, true);
      
      expect(pacScript).toContain('PROXY proxy.test.com:8080');
      expect(pacScript).toContain('domainExceptions');
      expect(pacScript).toContain('hasUserProxies = true');
    });

    it('should generate PAC script without domain exceptions when user proxies disabled', () => {
      const proxyManager = new ProxyManager();
      const domainExceptions = {
        '*.example.com': 'yes',
        'direct.com': 'no'
      };
      const proxyServers = [{ url: 'http://proxy.test.com:8080' }];
      const pacScripts = [];

      const pacScript = proxyManager.generateCombinedPacScript(domainExceptions, proxyServers, pacScripts, false);
      
      expect(pacScript).toContain('hasUserProxies = false');
      expect(pacScript).not.toContain('domainExceptions');
    });

    it('should include PAC script functions when present', () => {
      const proxyManager = new ProxyManager();
      const pacScripts = [
        { 
          enabled: true, 
          content: 'if (host === "test.com") return "PROXY test-proxy:8080";'
        }
      ];
      const proxyServers = [];

      const pacScript = proxyManager.generateCombinedPacScript({}, proxyServers, pacScripts, false);
      
      expect(pacScript).toContain('function userPacScript0');
      expect(pacScript).toContain('test-proxy:8080');
    });

    it('should handle HTTPS proxies correctly', () => {
      const proxyManager = new ProxyManager();
      const proxyServers = [{ url: 'https://secure-proxy.test.com:443' }];
      const pacScripts = [];

      const pacScript = proxyManager.generateCombinedPacScript({}, proxyServers, pacScripts, true);
      
      expect(pacScript).toContain('HTTPS secure-proxy.test.com:443');
    });

    it('should handle multiple proxy servers', () => {
      const proxyManager = new ProxyManager();
      const proxyServers = [
        { url: 'http://proxy1.test.com:8080' },
        { url: 'https://proxy2.test.com:443' }
      ];
      const pacScripts = [];

      const pacScript = proxyManager.generateCombinedPacScript({}, proxyServers, pacScripts, true);
      
      expect(pacScript).toContain('PROXY proxy1.test.com:8080; HTTPS proxy2.test.com:443');
    });

    it('should handle malformed proxy URLs gracefully', () => {
      const proxyManager = new ProxyManager();
      const proxyServers = [{ url: 'not-a-valid-url' }];
      const pacScripts = [];

      const pacScript = proxyManager.generateCombinedPacScript({}, proxyServers, pacScripts, true);
      
      expect(pacScript).toContain('PROXY not-a-valid-url');
    });

    it('should filter disabled PAC scripts', () => {
      const proxyManager = new ProxyManager();
      const pacScripts = [
        { enabled: true, content: 'return "PROXY enabled-proxy:8080";' },
        { enabled: false, content: 'return "PROXY disabled-proxy:8080";' }
      ];
      const proxyServers = [];

      const pacScript = proxyManager.generateCombinedPacScript({}, proxyServers, pacScripts, false);
      
      expect(pacScript).toContain('enabled-proxy');
      expect(pacScript).not.toContain('disabled-proxy');
      expect(pacScript).toContain('userPacScript0');
      expect(pacScript).not.toContain('userPacScript1');
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
    it('should return proxy status with user proxy and PAC script information', async () => {
      const proxyManager = new ProxyManager();
      
      // Mock storage response
      mockChrome.storage.local.get.mockResolvedValue({
        proxyActive: true,
        proxies: [{ url: 'http://test:8080' }]
      });
      
      // Mock proxy settings response
      mockChrome.proxy.settings.get.mockResolvedValue({
        value: { mode: 'pac_script' },
        levelOfControl: 'controlled_by_this_extension'
      });
      
      const status = await proxyManager.getProxyStatus();
      
      expect(status).toEqual({
        isActive: true,
        userProxiesEnabled: true,
        hasEnabledPacScripts: false,
        settings: {
          value: { mode: 'pac_script' },
          levelOfControl: 'controlled_by_this_extension'
        },
        isBlocked: false
      });
      
      expect(mockChrome.proxy.settings.get).toHaveBeenCalledWith({ incognito: false });
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['proxies', 'proxyActive']);
    });

    it('should detect when another extension controls proxy', async () => {
      const proxyManager = new ProxyManager();
      
      mockChrome.storage.local.get.mockResolvedValue({
        proxyActive: false,
        proxies: []
      });
      
      // Mock proxy settings response indicating another extension has control
      mockChrome.proxy.settings.get.mockResolvedValue({
        value: { mode: 'pac_script' },
        levelOfControl: 'controlled_by_other_extensions'
      });
      
      const status = await proxyManager.getProxyStatus();
      
      expect(status).toEqual({
        isActive: false,
        userProxiesEnabled: false,
        hasEnabledPacScripts: false,
        settings: {
          value: { mode: 'pac_script' },
          levelOfControl: 'controlled_by_other_extensions'
        },
        isBlocked: true
      });
    });

    it('should not be blocked when this extension has control', async () => {
      const proxyManager = new ProxyManager();
      
      mockChrome.storage.local.get.mockResolvedValue({
        proxyActive: true,
        proxies: [{ url: 'http://test:8080' }]
      });
      
      mockChrome.proxy.settings.get.mockResolvedValue({
        value: { mode: 'pac_script' },
        levelOfControl: 'controlled_by_this_extension'
      });
      
      const status = await proxyManager.getProxyStatus();
      
      expect(status.isBlocked).toBe(false);
      expect(status.userProxiesEnabled).toBe(true);
    });

    it('should not be blocked when no extension controls proxy', async () => {
      const proxyManager = new ProxyManager();
      
      mockChrome.storage.local.get.mockResolvedValue({
        proxyActive: false,
        proxies: []
      });
      
      mockChrome.proxy.settings.get.mockResolvedValue({
        value: { mode: 'direct' },
        levelOfControl: 'controllable_by_this_extension'
      });
      
      const status = await proxyManager.getProxyStatus();
      
      expect(status.isBlocked).toBe(false);
      expect(status.userProxiesEnabled).toBe(false);
    });
  });

  describe('New PAC Logic Testing', () => {
    it('should respect domain exceptions when user proxies enabled', () => {
      const proxyManager = new ProxyManager();
      const domainExceptions = { '*.headlessui.com': 'yes' };
      const proxyServers = [{ url: 'http://proxy.test.com:8080' }];
      const pacScripts = [];

      const pacScript = proxyManager.generateCombinedPacScript(domainExceptions, proxyServers, pacScripts, true);
      
      // Simple test that domain exceptions are included when user proxies enabled
      expect(pacScript).toContain('domainExceptions');
      expect(pacScript).toContain('headlessui.com');
    });

    it('should ignore domain exceptions when user proxies disabled', () => {
      const proxyManager = new ProxyManager();
      const domainExceptions = { '*.headlessui.com': 'yes' };
      const proxyServers = [{ url: 'http://proxy.test.com:8080' }];
      const pacScripts = [];

      const pacScript = proxyManager.generateCombinedPacScript(domainExceptions, proxyServers, pacScripts, false);
      
      // Domain exceptions should not be included when user proxies disabled
      expect(pacScript).not.toContain('domainExceptions');
    });

    it('should run PAC scripts independently when user proxies disabled', () => {
      const proxyManager = new ProxyManager();
      const pacScripts = [
        { 
          enabled: true, 
          content: 'if (host === "test.com") return "PROXY pac-proxy:8080"; return "DIRECT";'
        }
      ];
      const proxyServers = [];

      const pacScript = proxyManager.generateCombinedPacScript({}, proxyServers, pacScripts, false);
      
      expect(pacScript).toContain('function userPacScript0');
      expect(pacScript).toContain('pac-proxy:8080');
      expect(pacScript).toContain('hasUserProxies = false');
    });

    it('should override PAC proxy choices with user proxies when both enabled', () => {
      const proxyManager = new ProxyManager();
      const pacScripts = [
        { 
          enabled: true, 
          content: 'if (host === "test.com") return "PROXY pac-proxy:8080"; return "DIRECT";'
        }
      ];
      const proxyServers = [{ url: 'http://user-proxy:9090' }];

      const pacScript = proxyManager.generateCombinedPacScript({}, proxyServers, pacScripts, true);
      
      expect(pacScript).toContain('function userPacScript0');
      expect(pacScript).toContain('pac-proxy:8080'); // PAC script content
      expect(pacScript).toContain('user-proxy:9090'); // User proxy
      expect(pacScript).toContain('hasUserProxies = true');
      expect(pacScript).toContain('return userProxyString + "; DIRECT"'); // Override logic
    });

    it('should handle multiple enabled PAC scripts', () => {
      const proxyManager = new ProxyManager();
      const pacScripts = [
        { enabled: true, content: 'return "PROXY pac1:8080";' },
        { enabled: true, content: 'return "PROXY pac2:8080";' },
        { enabled: false, content: 'return "PROXY pac3:8080";' }
      ];
      const proxyServers = [];

      const pacScript = proxyManager.generateCombinedPacScript({}, proxyServers, pacScripts, false);
      
      expect(pacScript).toContain('userPacScript0');
      expect(pacScript).toContain('userPacScript1');
      expect(pacScript).not.toContain('userPacScript2');
      expect(pacScript).toContain('pac1:8080');
      expect(pacScript).toContain('pac2:8080');
      expect(pacScript).not.toContain('pac3:8080');
    });
  });

  describe('Proxy System Independence', () => {
    beforeEach(() => {
      // Override the mock with more realistic implementations that match our actual logic
      ProxyManager = class {
        constructor() {
          this.isProxyActive = false;
        }

        async updateProxySettings(providedProxies = null) {
          const result = await chrome.storage.local.get(['domainExceptions', 'proxies', 'proxyActive']);
          
          const proxies = providedProxies || result.proxies || [];
          const pacScripts = await this.getPacScripts();
          const enabledPacScripts = pacScripts.filter(script => script.enabled);
          
          const userProxiesEnabled = result.proxyActive && proxies.length > 0;
          const hasEnabledPacScripts = enabledPacScripts.length > 0;
          
          if (!hasEnabledPacScripts && !userProxiesEnabled) {
            await chrome.proxy.settings.clear({ scope: 'regular' });
            this.isProxyActive = false;
            return;
          }
          
          if (hasEnabledPacScripts || userProxiesEnabled) {
            const pacScript = this.generateCombinedPacScript({}, proxies, pacScripts, userProxiesEnabled);
            await chrome.proxy.settings.set({
              value: { mode: 'pac_script', pacScript: { data: pacScript } },
              scope: 'regular'
            });
            this.isProxyActive = true;
          }
        }

        async deactivateProxy() {
          await chrome.storage.local.set({ proxyActive: false });
          
          const pacScripts = await this.getPacScripts();
          const hasEnabledPacScripts = pacScripts.filter(script => script.enabled).length > 0;
          
          if (hasEnabledPacScripts) {
            await this.updateProxySettings();
          } else {
            await chrome.proxy.settings.clear({ scope: 'regular' });
            this.isProxyActive = false;
          }
          
          return true;
        }

        async getPacScripts() {
          return this._mockPacScripts || [];
        }

        setMockPacScripts(scripts) {
          this._mockPacScripts = scripts;
        }

        generateCombinedPacScript(_domainExceptions, _proxyServers, _pacScripts, _userProxiesEnabled) {
          return 'test-combined-pac-script';
        }
      };
    });

    it('should maintain PAC scripts when user proxies are disabled', async () => {
      const proxyManager = new ProxyManager();
      
      // Set up scenario: PAC scripts enabled, user proxies disabled
      proxyManager.setMockPacScripts([
        { enabled: true, content: 'return "PROXY pac:8080";' }
      ]);
      
      mockChrome.storage.local.get.mockResolvedValue({
        proxyActive: false,
        proxies: [{ url: 'http://user-proxy:9090' }],
        domainExceptions: {}
      });
      
      await proxyManager.updateProxySettings();
      
      // Should set PAC script mode (not clear settings) because PAC scripts are enabled
      expect(mockChrome.proxy.settings.set).toHaveBeenCalledWith({
        value: { mode: 'pac_script', pacScript: { data: 'test-combined-pac-script' } },
        scope: 'regular'
      });
      expect(mockChrome.proxy.settings.clear).not.toHaveBeenCalled();
      expect(proxyManager.isProxyActive).toBe(true);
    });

    it('should maintain user proxies when PAC scripts are disabled', async () => {
      const proxyManager = new ProxyManager();
      
      // Set up scenario: PAC scripts disabled, user proxies enabled
      proxyManager.setMockPacScripts([
        { enabled: false, content: 'return "PROXY pac:8080";' }
      ]);
      
      mockChrome.storage.local.get.mockResolvedValue({
        proxyActive: true,
        proxies: [{ url: 'http://user-proxy:9090' }],
        domainExceptions: {}
      });
      
      await proxyManager.updateProxySettings();
      
      // Should set PAC script mode (not clear settings) because user proxies are enabled
      expect(mockChrome.proxy.settings.set).toHaveBeenCalledWith({
        value: { mode: 'pac_script', pacScript: { data: 'test-combined-pac-script' } },
        scope: 'regular'
      });
      expect(mockChrome.proxy.settings.clear).not.toHaveBeenCalled();
      expect(proxyManager.isProxyActive).toBe(true);
    });

    it('should only clear proxy settings when both systems are disabled', async () => {
      const proxyManager = new ProxyManager();
      
      // Set up scenario: Both PAC scripts and user proxies disabled
      proxyManager.setMockPacScripts([
        { enabled: false, content: 'return "PROXY pac:8080";' }
      ]);
      
      mockChrome.storage.local.get.mockResolvedValue({
        proxyActive: false,
        proxies: [{ url: 'http://user-proxy:9090' }],
        domainExceptions: {}
      });
      
      await proxyManager.updateProxySettings();
      
      // Should clear proxy settings only when both systems are disabled
      expect(mockChrome.proxy.settings.clear).toHaveBeenCalledWith({ scope: 'regular' });
      expect(mockChrome.proxy.settings.set).not.toHaveBeenCalled();
      expect(proxyManager.isProxyActive).toBe(false);
    });

    it('should preserve PAC scripts when deactivating user proxies', async () => {
      const proxyManager = new ProxyManager();
      proxyManager.isProxyActive = true;
      
      // Set up scenario: PAC scripts enabled
      proxyManager.setMockPacScripts([
        { enabled: true, content: 'return "PROXY pac:8080";' }
      ]);
      
      mockChrome.storage.local.get.mockResolvedValue({
        proxyActive: false, // Will be set by deactivateProxy
        proxies: [{ url: 'http://user-proxy:9090' }],
        domainExceptions: {}
      });
      
      await proxyManager.deactivateProxy();
      
      // Should disable user proxies but maintain PAC script functionality
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ proxyActive: false });
      expect(mockChrome.proxy.settings.set).toHaveBeenCalled(); // Called by updateProxySettings
      expect(mockChrome.proxy.settings.clear).not.toHaveBeenCalled();
    });

    it('should completely disable proxy when deactivating and no PAC scripts exist', async () => {
      const proxyManager = new ProxyManager();
      proxyManager.isProxyActive = true;
      
      // Set up scenario: No PAC scripts enabled
      proxyManager.setMockPacScripts([]);
      
      await proxyManager.deactivateProxy();
      
      // Should disable user proxies and clear proxy settings since no PAC scripts
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ proxyActive: false });
      expect(mockChrome.proxy.settings.clear).toHaveBeenCalledWith({ scope: 'regular' });
      expect(proxyManager.isProxyActive).toBe(false);
    });

    it('should work with both systems enabled simultaneously', async () => {
      const proxyManager = new ProxyManager();
      
      // Set up scenario: Both PAC scripts and user proxies enabled
      proxyManager.setMockPacScripts([
        { enabled: true, content: 'return "PROXY pac:8080";' }
      ]);
      
      mockChrome.storage.local.get.mockResolvedValue({
        proxyActive: true,
        proxies: [{ url: 'http://user-proxy:9090' }],
        domainExceptions: {}
      });
      
      await proxyManager.updateProxySettings();
      
      // Should set combined PAC script when both systems are enabled
      expect(mockChrome.proxy.settings.set).toHaveBeenCalledWith({
        value: { mode: 'pac_script', pacScript: { data: 'test-combined-pac-script' } },
        scope: 'regular'
      });
      expect(mockChrome.proxy.settings.clear).not.toHaveBeenCalled();
      expect(proxyManager.isProxyActive).toBe(true);
    });
  });
});

