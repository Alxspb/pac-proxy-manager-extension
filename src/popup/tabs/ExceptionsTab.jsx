import { useState, useEffect } from 'react';
import { RadioGroup, Disclosure, DisclosureButton, DisclosurePanel, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { CogIcon, CheckIcon, XMarkIcon, ChevronDownIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ExceptionsTab = () => {
  const [domain, setDomain] = useState('');
  const [proxyOption, setProxyOption] = useState('pac');
  const [messages, setMessages] = useState({});
  const [exceptions, setExceptions] = useState({});
  const [proxies, setProxies] = useState([]);
  const [bulkImportYesText, setBulkImportYesText] = useState('');
  const [bulkImportNoText, setBulkImportNoText] = useState('');
  const [selectedBulkOption, setSelectedBulkOption] = useState(0);

  useEffect(() => {
    const loadMessages = () => {
      const msgs = {
        exceptionsTitle: chrome.i18n.getMessage('tabExceptions'),
        domainInputLabel: chrome.i18n.getMessage('domainInputLabel'),

        proxyOptionPac: chrome.i18n.getMessage('proxyOptionPac'),
        proxyOptionYes: chrome.i18n.getMessage('proxyOptionYes'),
        proxyOptionNo: chrome.i18n.getMessage('proxyOptionNo'),
        proxyOptionsLabel: chrome.i18n.getMessage('proxyOptionsLabel'),
        bulkImport: chrome.i18n.getMessage('bulkImport'),
        bulkImportTitle: chrome.i18n.getMessage('bulkImportTitle'),
        bulkImportPlaceholder: chrome.i18n.getMessage('bulkImportPlaceholder'),
        bulkImportYesTab: chrome.i18n.getMessage('bulkImportYesTab'),
        bulkImportNoTab: chrome.i18n.getMessage('bulkImportNoTab'),
        bulkImportButton: chrome.i18n.getMessage('bulkImportButton'),
        currentExceptions: chrome.i18n.getMessage('currentExceptions'),
        noCurrentExceptions: chrome.i18n.getMessage('noCurrentExceptions'),
        exceptionsRequireProxies: chrome.i18n.getMessage('exceptionsRequireProxies'),
        importSuccess: chrome.i18n.getMessage('importSuccess'),
        importError: chrome.i18n.getMessage('importError')
      };
      setMessages(msgs);
    };

    const loadExceptions = async () => {
      try {
        const result = await chrome.storage.local.get(['domainExceptions', 'proxies']);
        const storedExceptions = result.domainExceptions || {};
        const storedProxies = result.proxies || [];
        setExceptions(storedExceptions);
        setProxies(storedProxies);
      } catch (_error) {
        setExceptions({});
        setProxies([]);
      }
    };

    const getCurrentDomain = async () => {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (activeTab) {
          if (activeTab.url && (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://'))) {
            try {
              const url = new URL(activeTab.url);
              const hostname = url.hostname;
              
              if (hostname && !hostname.match(/^[a-z]{32}$/) && hostname !== 'localhost') {
                const domain = `*.${hostname}`;
                setDomain(domain);
              }
            } catch (_error) {
              // Error parsing URL
            }
          }
        }
      } catch (_error) {
        // Error in getCurrentDomain
      }
    };

    const initializeTab = async () => {
      loadMessages();
      await loadExceptions();
      
      try {
        await getCurrentDomain();
      } catch (_error) {
        // Domain will remain empty, showing placeholder
      }
    };

    initializeTab();
  }, []);

  useEffect(() => {
    if (domain && exceptions) {
      if (exceptions[domain]) {
        setProxyOption(exceptions[domain]);
      } else {
        setProxyOption('pac');
      }
    }
  }, [domain, exceptions]);

  useEffect(() => {
    const yesExceptions = Object.keys(exceptions).filter(key => exceptions[key] === 'yes');
    const noExceptions = Object.keys(exceptions).filter(key => exceptions[key] === 'no');
    
    setBulkImportYesText(yesExceptions.join('\n'));
    setBulkImportNoText(noExceptions.join('\n'));
  }, [exceptions]);

  const saveException = async (domain, option) => {
    if (!domain) {
      return;
    }
    
    try {
      const updatedExceptions = { ...exceptions };
      
      if (option === 'pac') {
        delete updatedExceptions[domain];
      } else {
        updatedExceptions[domain] = option;
      }
      
      await chrome.storage.local.set({ domainExceptions: updatedExceptions });
      setExceptions(updatedExceptions);
    } catch (_error) {
      // Error saving exception
    }
  };

  const handleProxyOptionChange = (newOption) => {
    setProxyOption(newOption);
    saveException(domain, newOption);
  };

  const handleBulkImport = async () => {
    const currentText = selectedBulkOption === 0 ? bulkImportYesText : bulkImportNoText;
    if (!currentText.trim()) {
      return;
    }

    const domains = currentText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    if (domains.length === 0) {
      return;
    }

    const option = selectedBulkOption === 0 ? 'yes' : 'no';

    try {
      const updatedExceptions = {};
      
      Object.entries(exceptions).forEach(([domain, domainOption]) => {
        if (domainOption !== option) {
          updatedExceptions[domain] = domainOption;
        }
      });

      domains.forEach(domain => {
        if (domain) {
          updatedExceptions[domain] = option;
        }
      });

      await chrome.storage.local.set({ domainExceptions: updatedExceptions });
      setExceptions(updatedExceptions);
      
      toast.success(messages.importSuccess);
    } catch (_error) {
      toast.error(messages.importError);
    }
  };

  return (
    <div className="space-y-6 min-h-[250px]">
      {/* Exceptions Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {messages.exceptionsTitle}
          </h3>
        </div>

        {proxies.length === 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-4">
            <p className="text-sm text-amber-800">
              ⚠️ {messages.exceptionsRequireProxies}
            </p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="domain-input" className="block text-sm font-semibold text-gray-900 mb-2">
              {messages.domainInputLabel}
            </label>
            <input
              id="domain-input"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="*.example.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <RadioGroup value={proxyOption} onChange={handleProxyOptionChange}>
              <RadioGroup.Label className="block text-sm font-semibold text-gray-900 mb-3">
                {messages.proxyOptionsLabel}
              </RadioGroup.Label>
              <div className="flex gap-3">
                <RadioGroup.Option value="pac">
                  {({ checked }) => (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border ${
                      checked ? 'bg-slate-500 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-700'
                    }`}>
                      <CogIcon className={`w-4 h-4 flex-shrink-0 ${checked ? 'text-white' : 'text-slate-500'}`} />
                      <RadioGroup.Label className="text-sm font-medium cursor-pointer">
                        {messages.proxyOptionPac}
                      </RadioGroup.Label>
                    </div>
                  )}
                </RadioGroup.Option>

                <RadioGroup.Option value="yes">
                  {({ checked }) => (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border ${
                      checked ? 'bg-slate-500 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-700'
                    }`}>
                      <CheckIcon className={`w-4 h-4 flex-shrink-0 ${checked ? 'text-white' : 'text-green-500'}`} />
                      <RadioGroup.Label className="text-sm font-medium cursor-pointer">
                        {messages.proxyOptionYes}
                      </RadioGroup.Label>
                    </div>
                  )}
                </RadioGroup.Option>

                <RadioGroup.Option value="no">
                  {({ checked }) => (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border ${
                      checked ? 'bg-slate-500 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-700'
                    }`}>
                      <XMarkIcon className={`w-4 h-4 flex-shrink-0 ${checked ? 'text-white' : 'text-red-500'}`} />
                      <RadioGroup.Label className="text-sm font-medium cursor-pointer">
                        {messages.proxyOptionNo}
                      </RadioGroup.Label>
                    </div>
                  )}
                </RadioGroup.Option>
              </div>
            </RadioGroup>
          </div>

          <Disclosure>
            {({ open }) => (
              <>
                <DisclosureButton className="flex w-full justify-between rounded-lg bg-slate-100 px-4 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring focus-visible:ring-slate-500 focus-visible:ring-opacity-75">
                  <span className="flex items-center gap-2">
                    <DocumentArrowUpIcon className="w-5 h-5" />
                    {messages.bulkImport}
                  </span>
                  <ChevronDownIcon
                    className={`w-5 h-5 text-slate-500 ${
                      open ? 'rotate-180 transform' : ''
                    }`}
                  />
                </DisclosureButton>
                <DisclosurePanel className="px-4 pt-4 pb-2 text-sm border border-gray-200 rounded-b-lg space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      {messages.bulkImportTitle}
                    </h3>
                
                    <TabGroup selectedIndex={selectedBulkOption} onChange={setSelectedBulkOption}>
                      <TabList className="flex gap-2 mb-4">
                        <Tab className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap focus:outline-none data-hover:bg-slate-100 data-hover:text-slate-600 data-selected:bg-slate-500 data-selected:text-white data-selected:data-hover:bg-slate-600">
                          <CheckIcon className="w-4 h-4 flex-shrink-0" />
                          {messages.proxyOptionYes}
                        </Tab>
                        <Tab className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap focus:outline-none data-hover:bg-slate-100 data-hover:text-slate-600 data-selected:bg-slate-500 data-selected:text-white data-selected:data-hover:bg-slate-600">
                          <XMarkIcon className="w-4 h-4 flex-shrink-0" />
                          {messages.proxyOptionNo}
                        </Tab>
                      </TabList>
                  
                      <TabPanels className={'mb-1'}>
                        <TabPanel>
                          <textarea
                            value={bulkImportYesText}
                            onChange={(e) => setBulkImportYesText(e.target.value)}
                            placeholder={messages.bulkImportPlaceholder}
                            rows={4}
                            className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 resize-none"
                          />
                        </TabPanel>
                        <TabPanel>
                          <textarea
                            value={bulkImportNoText}
                            onChange={(e) => setBulkImportNoText(e.target.value)}
                            placeholder={messages.bulkImportPlaceholder}
                            rows={4}
                            className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 resize-none"
                          />
                        </TabPanel>
                      </TabPanels>
                    </TabGroup>

                    <button
                      onClick={handleBulkImport}
                      disabled={selectedBulkOption === 0 ? !bulkImportYesText.trim() : !bulkImportNoText.trim()}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-slate-500 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {messages.bulkImportButton}
                    </button>
                  </div>
                </DisclosurePanel>
              </>
            )}
          </Disclosure>
        </div>
      </div>
    </div>
  );
};

export default ExceptionsTab;
