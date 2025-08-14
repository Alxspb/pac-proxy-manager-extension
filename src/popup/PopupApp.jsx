import React, { useState, useEffect } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import ExceptionsTab from './tabs/ExceptionsTab';
import ProxiesTab from './tabs/ProxiesTab';

const PopupApp = () => {
  const [messages, setMessages] = useState({});

  useEffect(() => {
    const loadMessages = () => {
      const msgs = {
        pacProxyManager: chrome.i18n.getMessage('pacProxyManager'),
        tabPacScript: chrome.i18n.getMessage('tabPacScript'),
        tabExceptions: chrome.i18n.getMessage('tabExceptions'),
        tabProxies: chrome.i18n.getMessage('tabProxies'),
        tabAbout: chrome.i18n.getMessage('tabAbout')
      };
      setMessages(msgs);
    };

    loadMessages();
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
      content: 'exceptions-tab'
    },
    {
      name: messages.tabProxies,
      content: 'proxies-tab'
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
    <div className="w-full min-w-[480px] bg-white p-4">
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
                {content === 'exceptions-tab' ? (
                  <ExceptionsTab />
                ) : content === 'proxies-tab' ? (
                  <ProxiesTab />
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
