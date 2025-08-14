import React, { useState, useEffect } from 'react';
import { PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

const OwnProxiesTab = () => {
  const [proxies, setProxies] = useState([]);
  const [messages, setMessages] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingProxyId, setEditingProxyId] = useState(null);
  const [editingUrl, setEditingUrl] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, proxyId: null, proxyUrl: '' });
  const [validationError, setValidationError] = useState('');
  const [editValidationError, setEditValidationError] = useState('');
  const [formData, setFormData] = useState({
    url: ''
  });

  useEffect(() => {
    const loadMessages = () => {
      const msgs = {
        proxiesTitle: chrome.i18n.getMessage('proxiesTitle'),
        addProxy: chrome.i18n.getMessage('addProxy'),
        save: chrome.i18n.getMessage('save'),
        cancel: chrome.i18n.getMessage('cancel'),
        confirmDelete: chrome.i18n.getMessage('confirmDelete'),
        confirmDeleteTitle: chrome.i18n.getMessage('confirmDeleteTitle'),
        proxyUrl: chrome.i18n.getMessage('proxyUrl'),
        invalidUrl: chrome.i18n.getMessage('invalidUrl'),
        invalidUrlRequired: chrome.i18n.getMessage('invalidUrlRequired'),
        invalidUrlProtocol: chrome.i18n.getMessage('invalidUrlProtocol'),
        invalidUrlHostname: chrome.i18n.getMessage('invalidUrlHostname'),
        invalidUrlPort: chrome.i18n.getMessage('invalidUrlPort'),
        invalidUrlFormat: chrome.i18n.getMessage('invalidUrlFormat'),
        duplicateUrl: chrome.i18n.getMessage('duplicateUrl')
      };
      setMessages(msgs);
    };

    const loadProxies = async () => {
      try {
        const result = await chrome.storage.local.get(['ownProxies']);
        const storedProxies = result.ownProxies || [];
        setProxies(storedProxies);
      } catch (error) {
        setProxies([]);
      }
    };

    const initializeTab = async () => {
      loadMessages();
      await loadProxies();
    };

    initializeTab();
  }, []);

  const validateProxyUrl = (url, excludeId = null) => {
    if (!url || !url.trim()) {
      return messages.invalidUrlRequired || 'URL is required';
    }

    const trimmedUrl = url.trim();
    
    // Check for duplicates
    const isDuplicate = proxies.some(proxy => 
      proxy.url.toLowerCase() === trimmedUrl.toLowerCase() && proxy.id !== excludeId
    );
    
    if (isDuplicate) {
      return messages.duplicateUrl || 'This proxy URL already exists';
    }
    
    // Check for basic URL structure
    try {
      const parsedUrl = new URL(trimmedUrl);
      
      // Check for supported protocols
      if (!['http:', 'https:', 'socks4:', 'socks5:'].includes(parsedUrl.protocol)) {
        return messages.invalidUrlProtocol || 'Only HTTP, HTTPS, SOCKS4, and SOCKS5 protocols are supported';
      }
      
      // Check for hostname
      if (!parsedUrl.hostname) {
        return messages.invalidUrlHostname || 'Hostname is required';
      }
      
      // Check for port (should be a number between 1-65535)
      if (parsedUrl.port) {
        const port = parseInt(parsedUrl.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          return messages.invalidUrlPort || 'Port must be between 1 and 65535';
        }
      }
      
      return null; // Valid URL
    } catch (error) {
      return messages.invalidUrlFormat || 'Invalid URL format';
    }
  };

  const saveProxies = async (updatedProxies) => {
    try {
      await chrome.storage.local.set({ ownProxies: updatedProxies });
      setProxies(updatedProxies);
    } catch (error) {
      // Error saving proxies
    }
  };

  const showAddForm = () => {
    setFormData({
      url: ''
    });
    setShowForm(true);
  };

  const startEdit = (proxy) => {
    setEditingProxyId(proxy.id);
    setEditingUrl(proxy.url);
  };

  const cancelEdit = () => {
    setEditingProxyId(null);
    setEditingUrl('');
    setEditValidationError('');
  };

  const saveEdit = async () => {
    const trimmedUrl = editingUrl.trim();
    const error = validateProxyUrl(trimmedUrl, editingProxyId);
    
    if (error) {
      setEditValidationError(error);
      return;
    }
    
    setEditValidationError('');
    
    const updatedProxies = proxies.map(proxy => 
      proxy.id === editingProxyId ? { ...proxy, url: trimmedUrl } : proxy
    );
    
    await saveProxies(updatedProxies);
    setEditingProxyId(null);
    setEditingUrl('');
  };

  const hideForm = () => {
    setShowForm(false);
    setValidationError('');
    setFormData({
      url: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const error = validateProxyUrl(formData.url);
    if (error) {
      setValidationError(error);
      return;
    }
    
    setValidationError('');

    const proxyData = {
      url: formData.url.trim(),
      id: Date.now()
    };

    const updatedProxies = [...proxies, proxyData];

    await saveProxies(updatedProxies);
    hideForm();
  };

  const showDeleteDialog = (proxy) => {
    setDeleteDialog({ 
      isOpen: true, 
      proxyId: proxy.id, 
      proxyUrl: proxy.url 
    });
  };

  const hideDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, proxyId: null, proxyUrl: '' });
  };

  const confirmDelete = async () => {
    const updatedProxies = proxies.filter(proxy => proxy.id !== deleteDialog.proxyId);
    await saveProxies(updatedProxies);
    hideDeleteDialog();
  };

  return (
    <div className="space-y-4">
      {proxies.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {messages.proxiesTitle}
          </h3>
        </div>
      )}

      {proxies.length === 0 ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {messages.addProxy}
          </h3>
          <div className="p-4 bg-white rounded-md border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {messages.proxyUrl}
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="http://proxy.example.com:8080"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {messages.save}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {proxies.map((proxy) => (
            <div
              key={proxy.id}
              className="border border-gray-200 rounded-md p-3 bg-white"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1 mr-2">
                  {editingProxyId === proxy.id ? (
                    <input
                      type="text"
                      value={editingUrl}
                      onChange={(e) => {
                        setEditingUrl(e.target.value);
                        if (editValidationError) setEditValidationError('');
                      }}
                      className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 ${
                        editValidationError 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : 'border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="text-sm text-gray-900 py-1">
                      {proxy.url}
                    </div>
                  )}
                  {editingProxyId === proxy.id && editValidationError && (
                    <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3 h-3 flex-shrink-0" />
                      {editValidationError}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  {editingProxyId === proxy.id ? (
                    <>
                      <button
                        onClick={saveEdit}
                        className="p-1 hover:bg-green-100 rounded text-gray-500 hover:text-green-600"
                        title="Save"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-600"
                        title="Cancel"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(proxy)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => showDeleteDialog(proxy)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      )}

      {/* Add Proxy Icon - Always show when there are proxies and not editing */}
      {proxies.length > 0 && !showForm && (
        <div className="flex justify-center mt-4">
          <button
            onClick={showAddForm}
            className="p-2 hover:bg-blue-50 rounded-full text-gray-400 hover:text-blue-500 transition-colors"
            title={messages.addProxy}
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-4 p-4 bg-white rounded-md border border-gray-200">
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              {messages.addProxy}
            </h4>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {messages.proxyUrl}
              </label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => {
                  setFormData({ ...formData, url: e.target.value });
                  if (validationError) setValidationError('');
                }}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                  validationError 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="http://proxy.example.com:8080"
                required
              />
              {validationError && (
                <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-3 h-3 flex-shrink-0" />
                  {validationError}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {messages.save}
              </button>
              <button
                type="button"
                onClick={hideForm}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                {messages.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onClose={hideDeleteDialog}>
        <div className="fixed inset-0 bg-black bg-opacity-25" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  {messages.confirmDeleteTitle}
                </DialogTitle>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  {messages.confirmDelete}
                </p>
                <div className="p-2 bg-gray-50 rounded text-sm text-gray-800 break-all">
                  {deleteDialog.proxyUrl}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Delete
                </button>
                <button
                  onClick={hideDeleteDialog}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  {messages.cancel}
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
};

export default OwnProxiesTab;
