import React, { useState, useEffect } from 'react';
import { PlayIcon, StopIcon, ServerIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

const ProxiesTab = () => {
  const [proxyStatus, setProxyStatus] = useState(false);
  const [proxies, setProxies] = useState([]);
  const [pacScripts, setPacScripts] = useState([]);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Proxy management states
  const [showForm, setShowForm] = useState(false);
  const [editingProxyId, setEditingProxyId] = useState(null);
  const [editingUrl, setEditingUrl] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, proxyId: null, proxyUrl: '' });
  const [validationError, setValidationError] = useState('');
  const [editValidationError, setEditValidationError] = useState('');
  const [formData, setFormData] = useState({ url: '' });

  useEffect(() => {
    const loadMessages = () => {
      const msgs = {
        proxyStatus: chrome.i18n.getMessage('proxyStatus'),
        activateProxy: chrome.i18n.getMessage('activateProxy'),
        deactivateProxy: chrome.i18n.getMessage('deactivateProxy'),
        proxyActive: chrome.i18n.getMessage('proxyActive'),
        proxyInactive: chrome.i18n.getMessage('proxyInactive'),
        noProxyServers: chrome.i18n.getMessage('noProxyServers'),
        configureProxyServers: chrome.i18n.getMessage('configureProxyServers'),
        proxiesTitle: chrome.i18n.getMessage('proxiesTitle'),
        addProxy: chrome.i18n.getMessage('addProxy'),
        save: chrome.i18n.getMessage('save'),
        cancel: chrome.i18n.getMessage('cancel'),
        confirmDelete: chrome.i18n.getMessage('confirmDelete'),
        confirmDeleteTitle: chrome.i18n.getMessage('confirmDeleteTitle'),
        proxyUrl: chrome.i18n.getMessage('proxyUrl'),
        invalidUrlRequired: chrome.i18n.getMessage('invalidUrlRequired'),
        invalidUrlProtocol: chrome.i18n.getMessage('invalidUrlProtocol'),
        invalidUrlHostname: chrome.i18n.getMessage('invalidUrlHostname'),
        invalidUrlPort: chrome.i18n.getMessage('invalidUrlPort'),
        invalidUrlFormat: chrome.i18n.getMessage('invalidUrlFormat'),
        duplicateUrl: chrome.i18n.getMessage('duplicateUrl'),
        proxyServersInfo: chrome.i18n.getMessage('proxyServersInfo')
      };
      setMessages(msgs);
    };

    const loadData = async () => {
      try {
        // Load proxy status
        const statusResponse = await chrome.runtime.sendMessage({ action: 'getProxyStatus' });
        setProxyStatus(statusResponse.isActive);

        // Load proxies and PAC scripts
        const result = await chrome.storage.local.get(['proxies', 'pacScripts']);
        const storedProxies = result.proxies || [];
        const storedPacScripts = result.pacScripts || [];
        setProxies(storedProxies);
        setPacScripts(storedPacScripts);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    const initializeTab = async () => {
      loadMessages();
      await loadData();
    };

    initializeTab();
  }, []);

  const toggleProxy = async () => {
    if (proxies.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const action = proxyStatus ? 'deactivateProxy' : 'activateProxy';
      const response = await chrome.runtime.sendMessage({ action });
      
      if (response === true) {
        setProxyStatus(!proxyStatus);
      }
    } catch (error) {
      console.error('Failed to toggle proxy:', error);
    } finally {
      setLoading(false);
    }
  };

  // Proxy management functions
  const validateProxyUrl = (url, excludeId = null) => {
    if (!url || !url.trim()) {
      return messages.invalidUrlRequired || 'URL is required';
    }

    const trimmedUrl = url.trim();
    
    const isDuplicate = proxies.some(proxy => 
      proxy.url.toLowerCase() === trimmedUrl.toLowerCase() && proxy.id !== excludeId
    );
    
    if (isDuplicate) {
      return messages.duplicateUrl || 'This proxy URL already exists';
    }
    
    try {
      const parsedUrl = new URL(trimmedUrl);
      
      if (!['http:', 'https:', 'socks4:', 'socks5:'].includes(parsedUrl.protocol)) {
        return messages.invalidUrlProtocol || 'Only HTTP, HTTPS, SOCKS4, and SOCKS5 protocols are supported';
      }
      
      if (!parsedUrl.hostname) {
        return messages.invalidUrlHostname || 'Hostname is required';
      }
      
      if (parsedUrl.port) {
        const port = parseInt(parsedUrl.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          return messages.invalidUrlPort || 'Port must be between 1 and 65535';
        }
      }
      
      return null;
    } catch (error) {
      return messages.invalidUrlFormat || 'Invalid URL format';
    }
  };

  const saveProxies = async (updatedProxies) => {
    try {
      await chrome.storage.local.set({ proxies: updatedProxies });
      setProxies(updatedProxies);
    } catch (error) {
      console.error('Failed to save proxies:', error);
    }
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
    setShowForm(false);
    setFormData({ url: '' });
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

  const showDeleteDialog = (proxy) => {
    setDeleteDialog({ 
      isOpen: true, 
      proxyId: proxy.id, 
      proxyUrl: proxy.url 
    });
  };

  const confirmDelete = async () => {
    const updatedProxies = proxies.filter(proxy => proxy.id !== deleteDialog.proxyId);
    await saveProxies(updatedProxies);
    setDeleteDialog({ isOpen: false, proxyId: null, proxyUrl: '' });
  };

  return (
    <div className="space-y-6">
      {/* Proxy Status Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ServerIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {messages.proxyStatus}
            </h3>
          </div>
          
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            proxyStatus 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              proxyStatus ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            {proxyStatus ? messages.proxyActive : messages.proxyInactive}
          </div>
        </div>

        {proxies.length === 0 ? (
          <div className="text-center py-6">
            <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">{messages.noProxyServers}</p>
            <p className="text-sm text-gray-500">{messages.configureProxyServers}</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={toggleProxy}
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm ${
                proxyStatus
                  ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-400'
                  : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-green-400'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : proxyStatus ? (
                <StopIcon className="w-4 h-4" />
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              {proxyStatus ? messages.deactivateProxy : messages.activateProxy}
            </button>
          </div>
        )}
      </div>

      {/* Proxy Servers Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {messages.proxiesTitle}
          </h3>
          
          {proxies.length > 0 && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              {messages.addProxy}
            </button>
          )}
        </div>

        {pacScripts.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              ℹ️ {messages.proxyServersInfo}
            </p>
          </div>
        )}

        {proxies.length === 0 && !showForm ? (
          <div className="text-center py-8">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-sm cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              {messages.addProxy}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {proxies.map((proxy) => (
              <div 
                key={proxy.id} 
                className={`border border-gray-200 rounded-md p-3 ${
                  editingProxyId === proxy.id ? '' : 'cursor-pointer hover:bg-gray-50'
                }`}
                onClick={() => editingProxyId !== proxy.id && startEdit(proxy)}
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
                      <div className="text-sm text-gray-900 py-1">{proxy.url}</div>
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
                        <button onClick={(e) => { e.stopPropagation(); saveEdit(); }} className="p-1 hover:bg-green-100 rounded text-gray-500 hover:text-green-600 cursor-pointer" title="Save">
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-600 cursor-pointer" title="Cancel">
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); showDeleteDialog(proxy); }} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 cursor-pointer" title="Delete">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Proxy Form */}
        {showForm && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
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

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                >
                  {messages.save}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setValidationError('');
                    setFormData({ url: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  {messages.cancel}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onClose={() => setDeleteDialog({ isOpen: false, proxyId: null, proxyUrl: '' })}>
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
                <p className="text-sm text-gray-600 mb-2">{messages.confirmDelete}</p>
                <div className="p-2 bg-gray-50 rounded text-sm text-gray-800 break-all">
                  {deleteDialog.proxyUrl}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteDialog({ isOpen: false, proxyId: null, proxyUrl: '' })}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
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

export default ProxiesTab;