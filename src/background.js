class ProxyManager {
  constructor() {
    this.isProxyActive = false;
    this.init().catch(error => console.error('Failed to initialize proxy manager:', error));
  }

  async init() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        const relevantChanges = ['domainExceptions', 'ownProxies', 'proxyActive'];
        const hasRelevantChanges = relevantChanges.some(key => changes[key]);

        if (hasRelevantChanges) {
          this.updateProxySettings().catch(error => console.error('Failed to update proxy settings:', error));
        }
      }
    });

    const result = await chrome.storage.local.get(['proxyActive']);
    this.isProxyActive = result.proxyActive || false;

    if (this.isProxyActive) {
      await this.updateProxySettings();
    }
  }

  generatePacScript(domainExceptions, proxyServers) {
    const proxyList = proxyServers.map(proxy => {
      try {
        const url = new URL(proxy.url);
        const protocol = url.protocol === 'https:' ? 'HTTPS' : 'PROXY';
        const port = url.port || (url.protocol === 'https:' ? '443' : '80');
        return `${protocol} ${url.hostname}:${port}`;
      } catch (e) {
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

  async updateProxySettings() {
    try {
      const result = await chrome.storage.local.get(['domainExceptions', 'ownProxies', 'proxyActive']);
      
      if (!result.proxyActive) {
        await this.deactivateProxy();
        return;
      }

      const domainExceptions = result.domainExceptions || {};
      const ownProxies = result.ownProxies || [];
      
      if (ownProxies.length === 0) {
        await this.deactivateProxy();
        return;
      }

      const pacScript = this.generatePacScript(domainExceptions, ownProxies);
      
      await chrome.proxy.settings.set({
        value: {
          mode: 'pac_script',
          pacScript: {
            data: pacScript
          }
        },
        scope: 'regular'
      });

      this.isProxyActive = true;
    } catch (error) {
      console.error('Failed to update proxy settings:', error);
    }
  }

  async activateProxy() {
    try {
      await chrome.storage.local.set({ proxyActive: true });
      this.isProxyActive = true;
      await this.updateProxySettings();
      return true;
    } catch (error) {
      console.error('Failed to activate proxy:', error);
      return false;
    }
  }

  async deactivateProxy() {
    try {
      await chrome.proxy.settings.clear({ scope: 'regular' });
      await chrome.storage.local.set({ proxyActive: false });
      this.isProxyActive = false;
      return true;
    } catch (error) {
      console.error('Failed to deactivate proxy:', error);
      return false;
    }
  }

  async getProxyStatus() {
    return {
      isActive: this.isProxyActive,
      settings: await chrome.proxy.settings.get({ incognito: false })
    };
  }
}

const proxyManager = new ProxyManager();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleAsync = async () => {
    try {
      switch (request.action) {
        case 'activateProxy':
          const activateResult = await proxyManager.activateProxy();
          sendResponse(activateResult);
          break;

        case 'deactivateProxy':
          const deactivateResult = await proxyManager.deactivateProxy();
          sendResponse(deactivateResult);
          break;

        case 'getProxyStatus':
          const status = await proxyManager.getProxyStatus();
          sendResponse(status);
          break;

        case 'updateProxySettings':
          await proxyManager.updateProxySettings();
          sendResponse(true);
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  };

  handleAsync();
  return true;
});