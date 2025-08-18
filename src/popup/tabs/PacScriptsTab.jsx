import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, PlusIcon, LinkIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { TrashIcon, CheckIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Switch } from '@headlessui/react';
import toast from 'react-hot-toast';
import indexedDBStorage from '../../utils/indexedDB';
import { PacScriptsSkeleton } from '../components/SkeletonLoader';

const PacScriptsTab = () => {
  const [pacScripts, setPacScripts] = useState([]);
  const [messages, setMessages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [proxyStatus, setProxyStatus] = useState(null);
  
  // PAC script management states
  const [showForm, setShowForm] = useState(false);
  const [editingScriptId, setEditingScriptId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, scriptId: null, scriptName: '' });
  // Removed validation error states - using toast notifications instead
  const [fetchingScript, setFetchingScript] = useState(false);
  const [fetchingEditScript, setFetchingEditScript] = useState(false);
  const [reloadingScript, setReloadingScript] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    inputType: 'url', // 'url' or 'plain'
    url: '',
    content: '',
    enabled: true
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    inputType: 'url',
    url: '',
    content: '',
    enabled: true
  });

  const [originalEditUrl, setOriginalEditUrl] = useState('');

  useEffect(() => {
    const loadMessages = () => {
      const msgs = {
        pacScriptsTitle: chrome.i18n.getMessage('pacScriptsTitle'),
        addPacScript: chrome.i18n.getMessage('addPacScript'),
        noPacScripts: chrome.i18n.getMessage('noPacScripts'),
        configurePacScripts: chrome.i18n.getMessage('configurePacScripts'),
        pacScriptName: chrome.i18n.getMessage('pacScriptName'),
        pacScriptNamePlaceholder: chrome.i18n.getMessage('pacScriptNamePlaceholder'),
        pacScriptUrl: chrome.i18n.getMessage('pacScriptUrl'),
        pacScriptUrlPlaceholder: chrome.i18n.getMessage('pacScriptUrlPlaceholder'),
        pacScriptContent: chrome.i18n.getMessage('pacScriptContent'),
        pacScriptContentPlaceholder: chrome.i18n.getMessage('pacScriptContentPlaceholder'),
        inputTypeUrl: chrome.i18n.getMessage('inputTypeUrl'),
        inputTypePlain: chrome.i18n.getMessage('inputTypePlain'),
        inputTypeLabel: chrome.i18n.getMessage('inputTypeLabel'),
        enabled: chrome.i18n.getMessage('enabled'),
        disabled: chrome.i18n.getMessage('disabled'),
        fetchingPacScript: chrome.i18n.getMessage('fetchingPacScript'),
        save: chrome.i18n.getMessage('save'),
        cancel: chrome.i18n.getMessage('cancel'),
        delete: chrome.i18n.getMessage('delete'),
        confirmDelete: chrome.i18n.getMessage('confirmDelete'),
        confirmDeleteTitle: chrome.i18n.getMessage('confirmDeleteTitle'),
        invalidPacScriptName: chrome.i18n.getMessage('invalidPacScriptName'),
        invalidPacScriptUrl: chrome.i18n.getMessage('invalidPacScriptUrl'),
        invalidPacScriptContent: chrome.i18n.getMessage('invalidPacScriptContent'),
        duplicatePacScriptName: chrome.i18n.getMessage('duplicatePacScriptName'),
        fetchPacScriptError: chrome.i18n.getMessage('fetchPacScriptError'),
        pacScriptTypePlain: chrome.i18n.getMessage('pacScriptTypePlain'),
        pacScriptTypeUrl: chrome.i18n.getMessage('pacScriptTypeUrl'),
        reloadScript: chrome.i18n.getMessage('reloadScript'),
        reloadingScript: chrome.i18n.getMessage('reloadingScript'),
        reloadSuccess: chrome.i18n.getMessage('reloadSuccess'),
        reloadError: chrome.i18n.getMessage('reloadError'),
        proxyControlWarningTitle: chrome.i18n.getMessage('proxyControlWarningTitle'),
        proxyControlWarningDescription: chrome.i18n.getMessage('proxyControlWarningDescription'),
        proxyControlWarningAction: chrome.i18n.getMessage('proxyControlWarningAction')
      };
      setMessages(msgs);
    };

    const loadPacScripts = async () => {
      try {
        const storedScripts = await indexedDBStorage.getPacScripts();
        setPacScripts(storedScripts);
      } catch (error) {
        setPacScripts([]);
      } finally {
        setIsLoading(false);
      }
    };

    const loadProxyStatus = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getProxyStatus' });
        setProxyStatus(response);
      } catch (error) {
        setProxyStatus(null);
      }
    };

    const initializeTab = async () => {
      loadMessages();
      await Promise.all([loadPacScripts(), loadProxyStatus()]);
    };

    initializeTab();
  }, []);

  const validatePacScript = (data, excludeId = null) => {
    if (!data.name || !data.name.trim()) {
      return messages.invalidPacScriptName;
    }

    const trimmedName = data.name.trim();
    const isDuplicateName = pacScripts.some(script => 
      script.name.toLowerCase() === trimmedName.toLowerCase() && script.id !== excludeId
    );
    
    if (isDuplicateName) {
      return messages.duplicatePacScriptName;
    }

    if (data.inputType === 'url') {
      if (!data.url || !data.url.trim()) {
        return messages.invalidPacScriptUrl;
      }
      
      try {
        new URL(data.url.trim());
      } catch (_error) {
        return messages.invalidPacScriptUrl;
      }
    } else {
      if (!data.content || !data.content.trim()) {
        return messages.invalidPacScriptContent;
      }
    }

    return null;
  };

  const fetchPacScript = async (url) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache',
        headers: {
          'Accept': 'text/plain, text/javascript, application/javascript, */*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      if (error.name === 'TypeError' && (error.message.includes('CORS') || error.message.includes('cors'))) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const text = await response.text();
          
          if (!text || text.trim().length === 0) {
            throw new Error('Empty response received');
          }
          
          return text;
        } catch (fallbackError) {
          throw new Error(messages.fetchPacScriptError + ' (Network error or CORS restriction)');
        }
      }
      
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
        throw new Error(messages.fetchPacScriptError + ' (Network error or CORS restriction)');
      }
      if (error.message.startsWith('HTTP ')) {
        throw new Error(messages.fetchPacScriptError + ' (' + error.message + ')');
      }
      throw new Error(messages.fetchPacScriptError);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const error = validatePacScript(formData);
    if (error) {
      toast.error(error);
      return;
    }

    let scriptContent = formData.content;

    if (formData.inputType === 'url') {
      setFetchingScript(true);
      try {
        scriptContent = await fetchPacScript(formData.url.trim());
      } catch (error) {
        toast.error(error.message);
        setFetchingScript(false);
        return;
      }
      setFetchingScript(false);
    }

    const scriptData = {
      id: Date.now(),
      name: formData.name.trim(),
      content: scriptContent.trim(),
      enabled: formData.enabled,
      sourceType: formData.inputType,
      sourceUrl: formData.inputType === 'url' ? formData.url.trim() : null,
      createdAt: new Date().toISOString()
    };

    try {
      await indexedDBStorage.addPacScript(scriptData);
      const updatedScripts = [...pacScripts, scriptData];
      setPacScripts(updatedScripts);
      setShowForm(false);
      setFormData({ name: '', inputType: 'url', url: '', content: '', enabled: true });
      
      chrome.runtime.sendMessage({ action: 'pacScriptsUpdated' }).catch(() => {});
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        toast.error('Storage quota exceeded. PAC script is too large to save.');
      } else {
        toast.error('Failed to save PAC script. Please try again.');
      }
    }
  };

  const startEdit = (script) => {
    setEditingScriptId(script.id);
    const isUrlScript = script.sourceType === 'url';
    const scriptUrl = isUrlScript ? script.sourceUrl || '' : '';
    setOriginalEditUrl(scriptUrl);
    setEditFormData({
      name: script.name,
      inputType: isUrlScript ? 'url' : 'plain',
      url: scriptUrl,
      content: isUrlScript ? '' : script.content,
      enabled: script.enabled
    });
  };

  const cancelEdit = () => {
    setEditingScriptId(null);
    setEditFormData({ name: '', inputType: 'url', url: '', content: '', enabled: true });
    setOriginalEditUrl('');
  };

  const saveEdit = async () => {
    const error = validatePacScript(editFormData, editingScriptId);
    
    if (error) {
      toast.error(error);
      return;
    }

    const currentScript = pacScripts.find(script => script.id === editingScriptId);
    let scriptContent = editFormData.content;

    if (editFormData.inputType === 'url') {
      const currentUrl = editFormData.url.trim();
      const urlChanged = currentUrl !== originalEditUrl;
      
      if (urlChanged) {
        setFetchingEditScript(true);
        try {
          scriptContent = await fetchPacScript(currentUrl);
        } catch (error) {
          toast.error(error.message);
          setFetchingEditScript(false);
          return;
        }
        setFetchingEditScript(false);
      } else {
        scriptContent = currentScript.content;
      }
    }
    
    const updatedScript = {
      ...pacScripts.find(script => script.id === editingScriptId),
      name: editFormData.name.trim(),
      content: scriptContent.trim(),
      enabled: editFormData.enabled,
      sourceType: editFormData.inputType,
      sourceUrl: editFormData.inputType === 'url' ? editFormData.url.trim() : null,
      updatedAt: new Date().toISOString()
    };

    try {
      await indexedDBStorage.updatePacScript(updatedScript);
      const updatedScripts = pacScripts.map(script => 
        script.id === editingScriptId ? updatedScript : script
      );
      setPacScripts(updatedScripts);
      setEditingScriptId(null);
      setEditFormData({ name: '', inputType: 'url', url: '', content: '', enabled: true });
      setOriginalEditUrl('');
      
      chrome.runtime.sendMessage({ action: 'pacScriptsUpdated' }).catch(() => {});
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        toast.error('Storage quota exceeded. PAC script is too large to save.');
      } else {
        toast.error('Failed to update PAC script. Please try again.');
      }
    }
  };

  const handleImmediateToggle = async (enabled) => {
    const currentScript = pacScripts.find(script => script.id === editingScriptId);
    if (!currentScript) {
      return;
    }

    const updatedScript = {
      ...currentScript,
      enabled: enabled,
      updatedAt: new Date().toISOString()
    };

    try {
      await indexedDBStorage.updatePacScript(updatedScript);
      const updatedScripts = pacScripts.map(script => 
        script.id === editingScriptId ? updatedScript : script
      );
      setPacScripts(updatedScripts);
      setEditFormData({ ...editFormData, enabled });
      
      chrome.runtime.sendMessage({ action: 'pacScriptsUpdated' }).catch(() => {});
    } catch (error) {
      toast.error('Failed to update PAC script status');
      // Revert the UI state on error
      setEditFormData({ ...editFormData, enabled: currentScript.enabled });
    }
  };

  const handleListToggle = async (scriptId, enabled) => {
    const currentScript = pacScripts.find(script => script.id === scriptId);
    if (!currentScript) {
      return;
    }

    const originalEnabled = currentScript.enabled;
    
    // Optimistically update UI first
    const optimisticScripts = pacScripts.map(script => 
      script.id === scriptId ? { ...script, enabled } : script
    );
    setPacScripts(optimisticScripts);

    const updatedScript = {
      ...currentScript,
      enabled: enabled,
      updatedAt: new Date().toISOString()
    };

    try {
      await indexedDBStorage.updatePacScript(updatedScript);
      chrome.runtime.sendMessage({ action: 'pacScriptsUpdated' }).catch(() => {});
    } catch (error) {
      toast.error('Failed to update PAC script status');
      // Revert the UI state on error
      const revertedScripts = pacScripts.map(script => 
        script.id === scriptId ? { ...script, enabled: originalEnabled } : script
      );
      setPacScripts(revertedScripts);
    }
  };

  const showDeleteDialog = (script) => {
    setDeleteDialog({ 
      isOpen: true, 
      scriptId: script.id, 
      scriptName: script.name 
    });
  };

  const reloadScript = async (script) => {
    if (script.sourceType !== 'url' || !script.sourceUrl) {
      return;
    }

    setReloadingScript(script.id);
    
    try {
      const newContent = await fetchPacScript(script.sourceUrl);
      
      const updatedScript = {
        ...script,
        content: newContent.trim(),
        updatedAt: new Date().toISOString()
      };

      await indexedDBStorage.updatePacScript(updatedScript);
      const updatedScripts = pacScripts.map(s => 
        s.id === script.id ? updatedScript : s
      );
      setPacScripts(updatedScripts);
      
      chrome.runtime.sendMessage({ action: 'pacScriptsUpdated' }).catch(() => {});

    } catch (_error) {
      // Silently handle error - don't update script on error
    } finally {
      setReloadingScript(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await indexedDBStorage.deletePacScript(deleteDialog.scriptId);
      const updatedScripts = pacScripts.filter(script => script.id !== deleteDialog.scriptId);
      setPacScripts(updatedScripts);
      setDeleteDialog({ isOpen: false, scriptId: null, scriptName: '' });
      
      chrome.runtime.sendMessage({ action: 'pacScriptsUpdated' }).catch(() => {});
    } catch (_error) {
      // Silently handle error
    }
  };

  if (isLoading) {
    return <PacScriptsSkeleton />;
  }

  return (
    <div className="space-y-6 min-h-[250px]">
      {proxyStatus?.isBlocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                {messages.proxyControlWarningTitle}
              </h4>
              <p className="text-sm text-amber-700 mb-2">
                {messages.proxyControlWarningDescription}
              </p>
              <p className="text-sm text-amber-600 font-medium">
                {messages.proxyControlWarningAction}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PAC Scripts Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {messages.pacScriptsTitle}
          </h3>
        </div>


        {pacScripts.length === 0 ? (
          // Auto-show form when no scripts exist
          <div></div>
        ) : (
          <div className="space-y-2">
            {pacScripts.map((script) => (
              <div 
                key={script.id} 
                className={`border border-gray-200 rounded-md p-3 ${
                  editingScriptId === script.id ? '' : 'cursor-pointer hover:bg-gray-50'
                }`}
                onClick={() => editingScriptId !== script.id && startEdit(script)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 mr-2">
                    {editingScriptId === script.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => {
                            setEditFormData({ ...editFormData, name: e.target.value });
                          }}
                          placeholder={messages.pacScriptNamePlaceholder}
                          className="w-full px-2 py-1 border border-slate-300 focus:border-slate-500 focus:ring-slate-500 rounded text-sm focus:outline-none focus:ring-1"
                          disabled={fetchingEditScript}
                        />
                        {editFormData.inputType === 'url' ? (
                          <input
                            type="url"
                            value={editFormData.url}
                            onChange={(e) => {
                              setEditFormData({ ...editFormData, url: e.target.value });
                            }}
                            placeholder={messages.pacScriptUrlPlaceholder}
                            className="w-full px-2 py-1 border border-slate-300 focus:border-slate-500 focus:ring-slate-500 rounded text-sm focus:outline-none focus:ring-1"
                            disabled={fetchingEditScript}
                          />
                        ) : (
                          <textarea
                            value={editFormData.content}
                            onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                            placeholder={messages.pacScriptContentPlaceholder}
                            rows={4}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:border-slate-500 focus:ring-slate-500 resize-none font-mono"
                            disabled={fetchingEditScript}
                          />
                        )}
                        <div className="flex items-center justify-between">
                          <Switch.Group>
                            <div className="flex items-center gap-2">
                              <Switch.Label className="text-sm text-gray-700">
                                {editFormData.enabled ? messages.enabled : messages.disabled}
                              </Switch.Label>
                              <Switch
                                checked={editFormData.enabled}
                                onChange={handleImmediateToggle}
                                disabled={fetchingEditScript}
                                className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${
                                  editFormData.enabled ? 'bg-slate-500' : 'bg-gray-200'
                                } ${fetchingEditScript ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 ${
                                    editFormData.enabled ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </Switch>
                            </div>
                          </Switch.Group>
                        </div>
                        {fetchingEditScript && (
                          <div className="text-slate-600 text-xs mt-1 flex items-center gap-1">
                            <div className="w-3 h-3 border border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                            {messages.fetchingPacScript}
                          </div>
                        )}

                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-900 py-1">{script.name}</div>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          script.sourceType === 'url' 
                            ? 'bg-slate-100 text-slate-600' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {script.sourceType === 'url' ? messages.pacScriptTypeUrl : messages.pacScriptTypePlain}
                        </span>
                        {reloadingScript === script.id && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <div className="w-3 h-3 border border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                            <span>{messages.reloadingScript}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    {editingScriptId === script.id ? (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); saveEdit(); 
                          }} 
                          disabled={fetchingEditScript}
                          className={`p-1 hover:bg-green-100 rounded text-gray-500 hover:text-green-600 cursor-pointer ${fetchingEditScript ? 'opacity-50 cursor-not-allowed' : ''}`} 
                          title="Save"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); cancelEdit(); 
                          }} 
                          disabled={fetchingEditScript}
                          className={`p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-600 cursor-pointer ${fetchingEditScript ? 'opacity-50 cursor-not-allowed' : ''}`} 
                          title="Cancel"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div 
                          className="p-1 flex items-center justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Switch
                            checked={script.enabled}
                            onChange={(enabled) => {
                              handleListToggle(script.id, enabled);
                            }}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${
                              script.enabled ? 'bg-slate-500' : 'bg-gray-200'
                            }`}
                            title={script.enabled ? messages.enabled : messages.disabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition ${
                                script.enabled ? 'translate-x-3' : 'translate-x-0'
                              }`}
                            />
                          </Switch>
                        </div>
                        {script.sourceType === 'url' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); reloadScript(script); 
                            }} 
                            disabled={reloadingScript === script.id}
                            className={`p-1 hover:bg-slate-100 rounded text-gray-500 hover:text-slate-600 cursor-pointer ${reloadingScript === script.id ? 'opacity-50 cursor-not-allowed' : ''}`} 
                            title={messages.reloadScript}
                          >
                            <ArrowPathIcon className={`w-4 h-4 ${reloadingScript === script.id ? '' : ''}`} />
                          </button>
                        )}
                        <button onClick={(e) => {
                          e.stopPropagation(); showDeleteDialog(script); 
                        }} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 cursor-pointer" title="Delete">
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

        {/* Centered Add Button */}
        {pacScripts.length > 0 && !showForm && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setShowForm(true)}
              className="p-3 bg-slate-500 text-white rounded-full hover:bg-slate-600 cursor-pointer"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Add PAC Script Form */}
        {(showForm || pacScripts.length === 0) && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">{messages.addPacScript}</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {messages.pacScriptName}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                  }}
                  placeholder={messages.pacScriptNamePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-slate-500 focus:ring-slate-500 rounded-md text-sm focus:outline-none focus:ring-1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {messages.inputTypeLabel}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="inputType"
                      value="url"
                      checked={formData.inputType === 'url'}
                      onChange={(e) => setFormData({ ...formData, inputType: e.target.value, content: '' })}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <LinkIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{messages.inputTypeUrl}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="inputType"
                      value="plain"
                      checked={formData.inputType === 'plain'}
                      onChange={(e) => setFormData({ ...formData, inputType: e.target.value, url: '' })}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <DocumentIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{messages.inputTypePlain}</span>
                  </label>
                </div>
              </div>

              {formData.inputType === 'url' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {messages.pacScriptUrl}
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => {
                      setFormData({ ...formData, url: e.target.value });
                    }}
                    placeholder={messages.pacScriptUrlPlaceholder}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-slate-500 focus:ring-slate-500 rounded-md text-sm focus:outline-none focus:ring-1"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {messages.pacScriptContent}
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => {
                      setFormData({ ...formData, content: e.target.value });
                    }}
                    placeholder={messages.pacScriptContentPlaceholder}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-slate-500 focus:ring-slate-500 rounded-md text-sm focus:outline-none focus:ring-1 resize-none font-mono"
                    required
                  />
                </div>
              )}

              <div>
                <Switch.Group>
                  <div className="flex items-center gap-3">
                    <Switch.Label className="text-sm font-medium text-gray-700">
                      {formData.enabled ? messages.enabled : messages.disabled}
                    </Switch.Label>
                    <Switch
                      checked={formData.enabled}
                      onChange={(enabled) => setFormData({ ...formData, enabled })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${
                        formData.enabled ? 'bg-slate-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 ${
                          formData.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </Switch>
                  </div>
                </Switch.Group>
              </div>



              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={fetchingScript}
                  className="flex-1 px-4 py-2 bg-slate-500 text-white text-sm font-medium rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {fetchingScript ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {messages.fetchingPacScript}
                    </>
                  ) : (
                    messages.save
                  )}
                </button>
                <button
                  type="button"
                  disabled={fetchingScript}
                  onClick={() => {
                    if (pacScripts.length > 0) {
                      setShowForm(false);
                    }
                    setFormData({ name: '', inputType: 'url', url: '', content: '', enabled: true });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed cursor-pointer"
                >
                  {messages.cancel}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onClose={() => setDeleteDialog({ isOpen: false, scriptId: null, scriptName: '' })}>
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
                  {deleteDialog.scriptName}
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
                  onClick={() => setDeleteDialog({ isOpen: false, scriptId: null, scriptName: '' })}
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

export default PacScriptsTab;
