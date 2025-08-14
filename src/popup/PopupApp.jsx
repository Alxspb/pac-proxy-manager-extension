import React, { useState, useEffect } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels, RadioGroup } from '@headlessui/react';

const PopupApp = () => {
  const [messages, setMessages] = useState({});
  const [domain, setDomain] = useState('');
  const [proxyOption, setProxyOption] = useState('pac');

  useEffect(() => {
    const loadMessages = () => {
      const msgs = {
        pacProxyManager: chrome.i18n.getMessage('pacProxyManager'),
        tabPacScript: chrome.i18n.getMessage('tabPacScript'),
        tabExceptions: chrome.i18n.getMessage('tabExceptions'),
        tabOwnProxies: chrome.i18n.getMessage('tabOwnProxies'),
        tabAbout: chrome.i18n.getMessage('tabAbout'),
        domainInputLabel: chrome.i18n.getMessage('domainInputLabel'),
        domainInputPlaceholder: chrome.i18n.getMessage('domainInputPlaceholder'),
        proxyOptionPac: chrome.i18n.getMessage('proxyOptionPac'),
        proxyOptionYes: chrome.i18n.getMessage('proxyOptionYes'),
        proxyOptionNo: chrome.i18n.getMessage('proxyOptionNo'),
        proxyOptionsLabel: chrome.i18n.getMessage('proxyOptionsLabel')
      };
      setMessages(msgs);
    };

    const getCurrentDomain = async () => {
      try {
        console.log('🔍 Getting current domain with activeTab permission...');
        
        // Opening the popup IS a user gesture that grants activeTab permission!
        // We should be able to query for the active tab directly
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        console.log('📋 Active tab query result:', activeTab ? 'Found' : 'Not found');
        
        if (activeTab) {
          console.log('🎯 Active tab details:');
          console.log('  - ID:', activeTab.id);
          console.log('  - URL:', activeTab.url);
          console.log('  - Title:', activeTab.title);
          
          if (activeTab.url && (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://'))) {
            try {
              const url = new URL(activeTab.url);
              const hostname = url.hostname;
              
              console.log('🌐 Extracted hostname:', hostname);
              
              if (hostname && !hostname.match(/^[a-z]{32}$/) && hostname !== 'localhost') {
                const domain = `*.${hostname}`;
                console.log('✅ SUCCESS! Setting domain to:', domain);
                setDomain(domain);
                return;
              } else {
                console.log('❌ Invalid hostname, using fallback');
              }
            } catch (error) {
              console.log('❌ Error parsing URL:', error);
            }
          } else {
            console.log('❌ No valid HTTP(S) URL found:', activeTab.url);
          }
        } else {
          console.log('❌ No active tab found');
        }
      } catch (error) {
        console.log('❌ Error in getCurrentDomain:', error);
        console.log('Error details:', error.message);
      }
      
      // Fallback
      console.log('🔄 Using fallback domain');
      setDomain('*.example.com');
    };

    const initializeWithFallback = async () => {
      loadMessages();
      
      try {
        await getCurrentDomain();
      } catch (error) {
        console.log('🔄 Domain detection failed, using fallback');
        setDomain('*.example.com');
      }
      
      // Set fallback after delay if getCurrentDomain didn't set anything
      setTimeout(() => {
        setDomain(current => {
          if (!current || current === '') {
            console.log('🔄 Setting fallback domain due to timeout');
            return '*.example.com';
          }
          return current;
        });
      }, 200);
    };

    initializeWithFallback();
  }, []);

  const categories = [
    {
      name: messages.tabPacScript,
      content: [
        {
          id: 1,
          title: 'Configure PAC Script URL',
          description: 'Set your proxy auto-configuration file location',
        },
        {
          id: 2,
          title: 'Test PAC Script',
          description: 'Validate your PAC configuration',
        },
      ],
    },
    {
      name: messages.tabExceptions,
      content: 'exceptions-form'
    },
    {
      name: messages.tabOwnProxies,
      content: [
        {
          id: 1,
          title: 'HTTP Proxy Servers',
          description: 'Configure your HTTP proxy settings',
        },
        {
          id: 2,
          title: 'SOCKS Proxy Servers',
          description: 'Configure your SOCKS proxy settings',
        },
      ],
    },
    {
      name: messages.tabAbout,
      content: [
        {
          id: 1,
          title: 'PAC Proxy Manager v1.0.0',
          description: 'Chrome extension for proxy management',
        },
        {
          id: 2,
          title: 'Documentation',
          description: 'Learn how to use proxy auto-configuration',
        },
      ],
    },
  ];

  return (
    <div className="min-w-fit max-w-lg bg-white p-4">
      <div className="w-full">
        <TabGroup>
          <TabList className="flex gap-2">
            {categories.map(({ name }) => (
              <Tab
                key={name}
                className="rounded-full px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap focus:outline-none data-hover:bg-blue-50 data-hover:text-blue-700 data-selected:bg-blue-500 data-selected:text-white data-selected:data-hover:bg-blue-600"
              >
                {name}
              </Tab>
            ))}
          </TabList>
          <TabPanels className="mt-3">
            {categories.map(({ name, content }) => (
              <TabPanel key={name} className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                {content === 'exceptions-form' ? (
                  <div className="space-y-4">
                    {/* Domain Input */}
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

                    {/* Radio Group */}
                    <div>
                      <RadioGroup value={proxyOption} onChange={setProxyOption}>
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
                ) : (
                  <ul>
                    {content.map((item) => (
                      <li key={item.id} className="relative rounded-md p-3 text-sm/6 hover:bg-white">
                        <div className="font-semibold text-gray-900">
                          {item.title}
                        </div>
                        <div className="text-gray-600">
                          {item.description}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabPanel>
            ))}
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
};

export default PopupApp;
