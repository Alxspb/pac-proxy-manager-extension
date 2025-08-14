import React, { useState } from 'react';

const PopupApp = () => {
  const [text, setText] = useState('Hello world');

  const handleInputChange = (e) => {
    setText(e.target.value || 'Hello world');
  };

  return (
    <div className="container">
      <h1>{text}</h1>
      <div className="input-section">
        <label htmlFor="text-input">Change text:</label>
        <input 
          id="text-input"
          type="text" 
          placeholder="Type something..."
          onChange={handleInputChange}
          className="text-input"
        />
      </div>
      <p className="subtitle">PAC Proxy Manager</p>
    </div>
  );
};

export default PopupApp;
