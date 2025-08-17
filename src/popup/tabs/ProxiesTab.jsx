import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import toast from 'react-hot-toast';
import { ProxiesSkeleton } from '../components/SkeletonLoader';

const ProxiesTab = () => {
  const [proxyStatus, setProxyStatus] = useState(false);
  const [proxies, setProxies] = useState([]);
  const [pacScripts, setPacScripts] = useState([]);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Proxy management states
  const [showForm, setShowForm] = useState(false);
  const [editingProxyId, setEditingProxyId] = useState(null);
  const [editingUrl, setEditingUrl] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, proxyId: null, proxyUrl: '' });
  // Removed validation error states - using toast notifications instead
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
        delete: chrome.i18n.getMessage('delete'),
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
      } catch (_error) {
        // Silently handle error
      } finally {
        setIsInitialLoading(false);
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
    } catch (_error) {
      // Silently handle error
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
    } catch (_error) {
      return messages.invalidUrlFormat || 'Invalid URL format';
    }
  };

  const saveProxies = async (updatedProxies) => {
    try {
      await chrome.storage.local.set({ proxies: updatedProxies });
      setProxies(updatedProxies);
    } catch (_error) {
      // Silently handle error
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const error = validateProxyUrl(formData.url);
    if (error) {
      toast.error(error);
      return;
    }

    const proxyData = {
      url: formData.url.trim(),
      id: Date.now()
    };

    const isFirstProxy = proxies.length === 0;
    const updatedProxies = [...proxies, proxyData];
    
    if (isFirstProxy) {
      // For first proxy, let background script handle both proxy save and activation atomically
      try {
        const response = await chrome.runtime.sendMessage({ 
          action: 'activateProxy',
          proxies: updatedProxies 
        });
        if (response === true) {
          setProxies(updatedProxies);
          setProxyStatus(true);
        }
      } catch (_error) {
        // Fallback to normal save if activation fails
        await saveProxies(updatedProxies);
      }
    } else {
      // For subsequent proxies, just save normally
      await saveProxies(updatedProxies);
    }
    
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
  };

  const saveEdit = async () => {
    const trimmedUrl = editingUrl.trim();
    const error = validateProxyUrl(trimmedUrl, editingProxyId);
    
    if (error) {
      toast.error(error);
      return;
    }
    
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

  if (isInitialLoading) {
    return <ProxiesSkeleton />;
  }

  return (
    <div className="space-y-6 min-h-[250px]">
      {/* Proxy Servers Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {messages.proxiesTitle}
          </h3>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleProxy}
              disabled={loading || proxies.length === 0}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                proxyStatus ? 'bg-slate-500' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={proxyStatus}
              aria-label={proxyStatus ? messages.deactivateProxy : messages.activateProxy}
              title={proxies.length === 0 ? messages.configureProxyServers : (proxyStatus ? messages.deactivateProxy : messages.activateProxy)}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                  proxyStatus ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </button>
          </div>
        </div>



        {pacScripts.length > 0 && proxies.length > 0 && (
          <div className="mb-4 p-3 bg-slate-100 border border-slate-300 rounded-md">
            <p className="text-sm text-slate-600">
              ℹ️ {messages.proxyServersInfo}
            </p>
          </div>
        )}

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
                      }}
                      className="w-full px-2 py-1 border border-slate-300 focus:border-slate-500 focus:ring-slate-500 rounded text-sm focus:outline-none focus:ring-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveEdit();
                        }
                        if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="text-sm text-gray-900 py-1">{proxy.url}</div>
                  )}

                </div>
                  
                <div className="flex gap-1">
                  {editingProxyId === proxy.id ? (
                    <>
                      <button onClick={(e) => {
                        e.stopPropagation(); saveEdit(); 
                      }} className="p-1 hover:bg-green-100 rounded text-gray-500 hover:text-green-600 cursor-pointer" title="Save">
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation(); cancelEdit(); 
                      }} className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-600 cursor-pointer" title="Cancel">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button onClick={(e) => {
                      e.stopPropagation(); showDeleteDialog(proxy); 
                    }} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 cursor-pointer" title="Delete">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Centered Add Button */}
        {proxies.length > 0 && !showForm && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setShowForm(true)}
              className="p-3 bg-slate-500 text-white rounded-full hover:bg-slate-600 cursor-pointer"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Add Proxy Form */}
        {(showForm || proxies.length === 0) && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">{messages.addProxy}</h3>
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
                  }}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-slate-500 focus:ring-slate-500 rounded-md text-sm focus:outline-none focus:ring-1"
                  placeholder="http://proxy.example.com:8080"
                  required
                />

              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-500 text-white text-sm font-medium rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 cursor-pointer"
                >
                  {messages.save}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (proxies.length > 0) {
                      setShowForm(false);
                    }
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
        <div className="fixed inset-0 bg-gray-900/50" />
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
                  {messages.delete}
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