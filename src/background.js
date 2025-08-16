// IndexedDB Storage for PAC Scripts
class IndexedDBStorage {
  constructor() {
    this.dbName = 'PacProxyManagerDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('pacScripts')) {
          const store = db.createObjectStore('pacScripts', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('enabled', 'enabled', { unique: false });
        }
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  async getPacScripts() {
    const db = await this.ensureDB();
    const transaction = db.transaction(['pacScripts'], 'readonly');
    const store = transaction.objectStore('pacScripts');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

const indexedDBStorage = new IndexedDBStorage();

class ProxyManager {
  constructor() {
    this.isProxyActive = false;
    this.init().catch(() => {});
  }

  async init() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        const relevantChanges = ['domainExceptions', 'proxies', 'proxyActive'];
        const hasRelevantChanges = relevantChanges.some(key => changes[key]);

        if (hasRelevantChanges) {
          this.updateProxySettings().catch(() => {});
        }
      }
    });

    const result = await chrome.storage.local.get(['proxyActive']);
    this.isProxyActive = result.proxyActive || false;

    if (this.isProxyActive) {
      await this.updateProxySettings();
    }
  }

  generateCombinedPacScript(domainExceptions, proxyServers, pacScripts) {
    // Generate user proxy string
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

    const hasUserProxies = proxyServers.length > 0;
    const userProxyString = hasUserProxies ? userProxyList : '';
    
    // Get enabled PAC scripts
    const enabledPacScripts = pacScripts.filter(script => script.enabled);
    
    // Generate PAC script functions for each enabled script
    const pacScriptFunctions = enabledPacScripts.map((script, index) => {
      // Wrap user PAC script in a function and handle errors
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
  const domainExceptions = ${JSON.stringify(domainExceptions || {})};
  const hasUserProxies = ${hasUserProxies};
  const userProxyString = "${userProxyString}";
  
  // 1. Check domain exceptions first (highest priority)
  function checkDomainException(domain) {
    if (domainExceptions[domain]) {
      const option = domainExceptions[domain];
      if (option === 'yes') {
        // Exception says "yes" - use user proxies if available
        return hasUserProxies ? userProxyString + "; DIRECT" : "DIRECT";
      }
      if (option === 'no') {
        // Exception says "no" - always direct, skip PAC scripts
        return "DIRECT";
      }
    }
    return null;
  }
  
  // Check exact host match
  let exceptionResult = checkDomainException(host);
  if (exceptionResult !== null) return exceptionResult;
  
  // Check wildcard domain matches
  for (const domain in domainExceptions) {
    if (domain.startsWith('*.')) {
      const baseDomain = domain.slice(2);
      if (host === baseDomain || host.endsWith('.' + baseDomain)) {
        exceptionResult = checkDomainException(domain);
        if (exceptionResult !== null) return exceptionResult;
      }
    }
  }
  
  // 2. No exception found - try PAC scripts
  ${enabledPacScripts.map((script, index) => `
  try {
    const pacResult${index} = userPacScript${index}(url, host);
    if (pacResult${index} !== "DIRECT") {
      // PAC script wants to use proxy
      if (hasUserProxies) {
        // Use user-configured proxies instead of PAC script's proxies
        return userProxyString + "; DIRECT";
      } else {
        // No user proxies, use what PAC script returned
        return pacResult${index};
      }
    }
  } catch (e) {
    // PAC script failed, continue to next one
  }`).join('\n')}
  
  // 3. All PAC scripts returned DIRECT or none exist - return DIRECT
  return "DIRECT";
}`;
  }

  async updateProxySettings() {
    try {
      const result = await chrome.storage.local.get(['domainExceptions', 'proxies', 'proxyActive']);
      
      if (!result.proxyActive) {
        await this.deactivateProxy();
        return;
      }

      const domainExceptions = result.domainExceptions || {};
      const proxies = result.proxies || [];
      const pacScripts = await indexedDBStorage.getPacScripts();
      
      const pacScript = this.generateCombinedPacScript(domainExceptions, proxies, pacScripts);
      
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
    } catch (_error) {
      // Silently handle error
    }
  }

  async activateProxy() {
    try {
      await chrome.storage.local.set({ proxyActive: true });
      this.isProxyActive = true;
      await this.updateProxySettings();
      return true;
    } catch (error) {
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
      return false;
    }
  }

  async getProxyStatus() {
    const settings = await chrome.proxy.settings.get({ incognito: false });
    return {
      isActive: this.isProxyActive,
      settings,
      isBlocked: settings.levelOfControl === 'controlled_by_other_extensions'
    };
  }
}

const proxyManager = new ProxyManager();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleAsync = async () => {
    try {
      switch (request.action) {
      case 'activateProxy': {
        const activateResult = await proxyManager.activateProxy();
        sendResponse(activateResult);
        break;
      }

      case 'deactivateProxy': {
        const deactivateResult = await proxyManager.deactivateProxy();
        sendResponse(deactivateResult);
        break;
      }

      case 'getProxyStatus': {
        const status = await proxyManager.getProxyStatus();
        sendResponse(status);
        break;
      }

      case 'updateProxySettings':
        await proxyManager.updateProxySettings();
        sendResponse(true);
        break;

      case 'pacScriptsUpdated':
        await proxyManager.updateProxySettings();
        sendResponse(true);
        break;

      default:
        sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }
  };

  handleAsync();
  return true;
});