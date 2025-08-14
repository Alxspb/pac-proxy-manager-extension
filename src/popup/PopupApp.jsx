import React, { useState, useEffect } from 'react';

const PopupApp = () => {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState({});

  useEffect(() => {
    const loadMessages = () => {
      const msgs = {
        helloWorld: chrome.i18n.getMessage('helloWorld'),
        changeText: chrome.i18n.getMessage('changeText'),
        typeSomething: chrome.i18n.getMessage('typeSomething'),
        pacProxyManager: chrome.i18n.getMessage('pacProxyManager')
      };
      setMessages(msgs);
      setText(msgs.helloWorld);
    };

    loadMessages();
  }, []);

  const handleInputChange = (e) => {
    setText(e.target.value || messages.helloWorld);
  };

  return (
    <div className="w-80 p-5 text-center bg-gray-50 font-sans">
      <h1 className="text-2xl font-medium text-gray-800 mb-5 min-h-8">{text}</h1>
      <div className="my-5">
        <label htmlFor="text-input" className="block mb-2 text-sm font-medium text-gray-600">
          {messages.changeText}
        </label>
        <input 
          id="text-input"
          type="text" 
          placeholder={messages.typeSomething}
          onChange={handleInputChange}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-inherit transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
        />
      </div>
      <p className="mt-5 mb-0 text-xs font-normal text-gray-500">{messages.pacProxyManager}</p>
    </div>
  );
};

export default PopupApp;
