import { useState, useEffect } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { Toaster } from 'react-hot-toast';
import ExceptionsTab from './tabs/ExceptionsTab';
import ProxiesTab from './tabs/ProxiesTab';
import PacScriptsTab from './tabs/PacScriptsTab';

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
      content: 'pac-scripts-tab'
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
          description: 'Chrome extension for proxy management'
        },
        {
          id: 2,
          title: 'Documentation',
          description: 'Learn how to use proxy auto-configuration'
        }
      ]
    }
  ];

  return (
    <div className="w-[500px] bg-white p-4 h-auto">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff'
            }
          }
        }}
      />
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
          <TabPanels className="mt-3 h-auto">
            {categories.map(({ name, content }) => (
              <TabPanel key={name} className="h-auto">
                {content === 'pac-scripts-tab' ? (
                  <PacScriptsTab />
                ) : content === 'exceptions-tab' ? (
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
