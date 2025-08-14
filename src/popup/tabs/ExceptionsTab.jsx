import React, { useState, useEffect } from 'react';
import { RadioGroup } from '@headlessui/react';

const ExceptionsTab = () => {
  const [domain, setDomain] = useState('');
  const [proxyOption, setProxyOption] = useState('pac');
  const [messages, setMessages] = useState({});
  const [exceptions, setExceptions] = useState({});

  useEffect(() => {
    const loadMessages = () => {
      const msgs = {
        domainInputLabel: chrome.i18n.getMessage('domainInputLabel'),
        domainInputPlaceholder: chrome.i18n.getMessage('domainInputPlaceholder'),
        proxyOptionPac: chrome.i18n.getMessage('proxyOptionPac'),
        proxyOptionYes: chrome.i18n.getMessage('proxyOptionYes'),
        proxyOptionNo: chrome.i18n.getMessage('proxyOptionNo'),
        proxyOptionsLabel: chrome.i18n.getMessage('proxyOptionsLabel')
      };
      setMessages(msgs);
    };

    const loadExceptions = async () => {
      try {
        const result = await chrome.storage.local.get(['domainExceptions']);
        const storedExceptions = result.domainExceptions || {};
        setExceptions(storedExceptions);
      } catch (error) {
        setExceptions({});
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
                return;
              }
            } catch (error) {
              // Error parsing URL
            }
          }
        }
      } catch (error) {
        // Error in getCurrentDomain
      }
      
      setDomain('*.example.com');
    };

    const initializeTab = async () => {
      loadMessages();
      await loadExceptions();
      
      try {
        await getCurrentDomain();
      } catch (error) {
        setDomain('*.example.com');
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

  const saveException = async (domain, option) => {
    if (!domain) return;
    
    try {
      const updatedExceptions = { ...exceptions };
      
      if (option === 'pac') {
        delete updatedExceptions[domain];
      } else {
        updatedExceptions[domain] = option;
      }
      
      await chrome.storage.local.set({ domainExceptions: updatedExceptions });
      setExceptions(updatedExceptions);
    } catch (error) {
      // Error saving exception
    }
  };

  const handleProxyOptionChange = (newOption) => {
    setProxyOption(newOption);
    saveException(domain, newOption);
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="domain-input" className="block text-sm font-semibold text-gray-900 mb-2">
          {messages.domainInputLabel}
        </label>
        <input
          id="domain-input"
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder={messages.domainInputPlaceholder}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                <div className={`flex items-center px-3 py-2 rounded-md cursor-pointer border ${
                  checked ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300 text-gray-700'
                }`}>
                  <RadioGroup.Label className="text-sm font-medium cursor-pointer">
                    {messages.proxyOptionPac}
                  </RadioGroup.Label>
                </div>
              )}
            </RadioGroup.Option>

            <RadioGroup.Option value="yes">
              {({ checked }) => (
                <div className={`flex items-center px-3 py-2 rounded-md cursor-pointer border ${
                  checked ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300 text-gray-700'
                }`}>
                  <RadioGroup.Label className="text-sm font-medium cursor-pointer">
                    {messages.proxyOptionYes}
                  </RadioGroup.Label>
                </div>
              )}
            </RadioGroup.Option>

            <RadioGroup.Option value="no">
              {({ checked }) => (
                <div className={`flex items-center px-3 py-2 rounded-md cursor-pointer border ${
                  checked ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300 text-gray-700'
                }`}>
                  <RadioGroup.Label className="text-sm font-medium cursor-pointer">
                    {messages.proxyOptionNo}
                  </RadioGroup.Label>
                </div>
              )}
            </RadioGroup.Option>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default ExceptionsTab;
