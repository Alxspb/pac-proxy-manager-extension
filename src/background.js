class ProxyManager {
  constructor() {
    this.isProxyActive = false;
    this.init();
  }

  async init() {
    // Listen for storage changes to update PAC script
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        const relevantChanges = ['domainExceptions', 'ownProxies', 'proxyActive'];
        const hasRelevantChanges = relevantChanges.some(key => changes[key]);

        if (hasRelevantChanges) {
          this.updateProxySettings();
        }
      }
    });

    // Load initial state
    const result = await chrome.storage.local.get(['proxyActive']);
    this.isProxyActive = result.proxyActive || false;

    if (this.isProxyActive) {
      this.updateProxySettings();
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
  // Domain exceptions from storage
  const domainExceptions = ${JSON.stringify(domainExceptions || {})};
  
  console.log('PAC: Checking URL:', url, 'Host:', host);
  console.log('PAC: Available domain exceptions:', domainExceptions);
  
  // Check for exact domain matches first
  if (domainExceptions[host]) {
    const option = domainExceptions[host];
    console.log('PAC: Found exact match for', host, 'option:', option);
    if (option === 'yes') {
      console.log('PAC: Returning proxy for exact match:', "${proxyString}");
      return "${proxyString}";
    }
    if (option === 'no') {
      console.log('PAC: Returning DIRECT for exact match');
      return "DIRECT";
    }
    // option === 'pac' falls through to default PAC logic
  }

  // Check for wildcard domain matches (*.example.com)
  for (const domain in domainExceptions) {
    if (domain.startsWith('*.')) {
      const baseDomain = domain.slice(2); // Remove '*.'
      console.log('PAC: Checking wildcard domain:', domain, 'baseDomain:', baseDomain);
      console.log('PAC: Host equals baseDomain?', host === baseDomain);
      console.log('PAC: Host ends with baseDomain?', host.endsWith('.' + baseDomain));
      
      if (host === baseDomain || host.endsWith('.' + baseDomain)) {
        const option = domainExceptions[domain];
        console.log('PAC: Found wildcard match for', host, 'with domain', domain, 'option:', option);
        if (option === 'yes') {
          console.log('PAC: Returning proxy for wildcard match:', "${proxyString}");
          return "${proxyString}";
        }
        if (option === 'no') {
          console.log('PAC: Returning DIRECT for wildcard match');
          return "DIRECT";
        }
        // option === 'pac' falls through to default PAC logic
      }
    }
  }

  console.log('PAC: No matches found, returning DIRECT');
  return "DIRECT";
}`;
  }

    async updateProxySettings() {
    try {
      const result = await chrome.storage.local.get(['domainExceptions', 'ownProxies', 'proxyActive']);
      
      console.log('=== PROXY UPDATE DEBUG ===');
      console.log('proxyActive:', result.proxyActive);
      console.log('domainExceptions:', result.domainExceptions);
      console.log('ownProxies:', result.ownProxies);
      
      if (!result.proxyActive) {
        console.log('Proxy not active, deactivating...');
        await this.deactivateProxy();
        return;
      }

      const domainExceptions = result.domainExceptions || {};
      const ownProxies = result.ownProxies || [];
      
      if (ownProxies.length === 0) {
        console.warn('No proxy servers configured');
        await this.deactivateProxy();
        return;
      }

      const pacScript = this.generatePacScript(domainExceptions, ownProxies);
      console.log('Generated PAC Script:');
      console.log(pacScript);
      
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
      console.log('Proxy activated with PAC script successfully!');
      console.log('=== END PROXY UPDATE DEBUG ===');
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
      console.log('Proxy deactivated');
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

// Initialize proxy manager
const proxyManager = new ProxyManager();

// Message handling for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'activateProxy':
      proxyManager.activateProxy().then(sendResponse);
      return true; // Keep message channel open for async response

    case 'deactivateProxy':
      proxyManager.deactivateProxy().then(sendResponse);
      return true;

    case 'getProxyStatus':
      proxyManager.getProxyStatus().then(sendResponse);
      return true;

    case 'updateProxySettings':
      proxyManager.updateProxySettings().then(() => sendResponse(true));
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});