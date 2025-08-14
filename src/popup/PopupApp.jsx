import React, { useState } from 'react';

const PopupApp = () => {
  const [text, setText] = useState('Hello world');

  const handleInputChange = (e) => {
    setText(e.target.value || 'Hello world');
  };

  return (
    <div className="w-80 p-5 text-center bg-gray-50 font-sans">
      <h1 className="text-2xl font-medium text-gray-800 mb-5 min-h-8">{text}</h1>
      <div className="my-5">
        <label htmlFor="text-input" className="block mb-2 text-sm font-medium text-gray-600">
          Change text:
        </label>
        <input 
          id="text-input"
          type="text" 
          placeholder="Type something..."
          onChange={handleInputChange}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-inherit transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
        />
      </div>
      <p className="mt-5 mb-0 text-xs font-normal text-gray-500">PAC Proxy Manager</p>
    </div>
  );
};

export default PopupApp;
