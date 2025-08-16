import { useState, useEffect } from 'react';

const AboutTab = () => {
  const [version, setVersion] = useState('');
  const [messages, setMessages] = useState({});
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const loadVersion = () => {
      const manifest = chrome.runtime.getManifest();
      setVersion(manifest.version);
    };

    const loadMessages = () => {
      const currentLocale = chrome.i18n.getUILanguage();
      setLocale(currentLocale);
      
      const msgs = {
        aboutTitle: chrome.i18n.getMessage('tabAbout'),
        appName: chrome.i18n.getMessage('appName'),
        aboutDescription: chrome.i18n.getMessage('aboutDescription'),
        aboutMadeBy: chrome.i18n.getMessage('aboutMadeBy'),
        aboutSupportAuthor: chrome.i18n.getMessage('aboutSupportAuthor'),
        aboutSupportLink: chrome.i18n.getMessage('aboutSupportLink'),
        aboutSupportUrl: chrome.i18n.getMessage('aboutSupportUrl'),
        aboutSourceCode: chrome.i18n.getMessage('aboutSourceCode'),
        aboutSourceCodeLink: chrome.i18n.getMessage('aboutSourceCodeLink')
      };
      setMessages(msgs);
    };

    loadVersion();
    loadMessages();
  }, []);

  return (
    <div className="space-y-6 min-h-[250px]">
      {/* About Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {messages.aboutTitle}
          </h3>
        </div>

        <div className="space-y-6">
          <div className="font-semibold text-gray-900 text-base mb-2">
            {messages.appName} v{version}
          </div>
          <div className="text-gray-600 text-sm space-y-2">
            <p>{messages.aboutDescription}</p>
            <p>{messages.aboutMadeBy} <a className="text-blue-500 hover:text-blue-600 underline" href="https://github.com/ilyachase" target="_blank" rel="noopener noreferrer">Ilya L.</a></p>
            <div className="flex items-center gap-1">
              <span>{messages.aboutSourceCode}</span>
              <img src="/icons/github.svg" alt="GitHub" className="w-4 h-4" />
              <a className="text-blue-500 hover:text-blue-600 underline" href="https://github.com/ilyachase/pac-proxy-manager-extension" target="_blank" rel="noopener noreferrer">{messages.aboutSourceCodeLink}</a>
            </div>
            <div className="flex items-center gap-1">
              <span>{messages.aboutSupportAuthor}</span>
              <img 
                src={locale.startsWith('ru') ? '/icons/boosty.svg' : '/icons/bmc-logo.svg'} 
                alt={locale.startsWith('ru') ? 'Boosty' : 'Buy Me Coffee'} 
                className="w-4 h-4" 
              />
              <a className="text-blue-500 hover:text-blue-600 underline" href={messages.aboutSupportUrl} target="_blank" rel="noopener noreferrer">{messages.aboutSupportLink}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutTab;
