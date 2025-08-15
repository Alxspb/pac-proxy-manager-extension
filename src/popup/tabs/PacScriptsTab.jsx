import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, PlusIcon, LinkIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Switch } from '@headlessui/react';

const PacScriptsTab = () => {
  const [pacScripts, setPacScripts] = useState([]);
  const [messages, setMessages] = useState({});
  
  // PAC script management states
  const [showForm, setShowForm] = useState(false);
  const [editingScriptId, setEditingScriptId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, scriptId: null, scriptName: '' });
  const [validationError, setValidationError] = useState('');
  const [editValidationError, setEditValidationError] = useState('');
  const [fetchingScript, setFetchingScript] = useState(false);
  
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
        confirmDelete: chrome.i18n.getMessage('confirmDelete'),
        confirmDeleteTitle: chrome.i18n.getMessage('confirmDeleteTitle'),
        invalidPacScriptName: chrome.i18n.getMessage('invalidPacScriptName'),
        invalidPacScriptUrl: chrome.i18n.getMessage('invalidPacScriptUrl'),
        invalidPacScriptContent: chrome.i18n.getMessage('invalidPacScriptContent'),
        duplicatePacScriptName: chrome.i18n.getMessage('duplicatePacScriptName'),
        fetchPacScriptError: chrome.i18n.getMessage('fetchPacScriptError')
      };
      setMessages(msgs);
    };

    const loadPacScripts = async () => {
      try {
        const result = await chrome.storage.local.get(['pacScripts']);
        const storedScripts = result.pacScripts || [];
        setPacScripts(storedScripts);
      } catch (error) {
        console.error('Failed to load PAC scripts:', error);
        setPacScripts([]);
      }
    };

    const initializeTab = async () => {
      loadMessages();
      await loadPacScripts();
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
      } catch (error) {
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
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(messages.fetchPacScriptError);
    }
    return await response.text();
  };

  const savePacScripts = async (updatedScripts) => {
    try {
      await chrome.storage.local.set({ pacScripts: updatedScripts });
      setPacScripts(updatedScripts);
    } catch (error) {
      console.error('Failed to save PAC scripts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const error = validatePacScript(formData);
    if (error) {
      setValidationError(error);
      return;
    }
    
    setValidationError('');

    let scriptContent = formData.content;

    if (formData.inputType === 'url') {
      setFetchingScript(true);
      try {
        scriptContent = await fetchPacScript(formData.url.trim());
      } catch (error) {
        setValidationError(error.message);
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
      createdAt: new Date().toISOString()
    };

    const updatedScripts = [...pacScripts, scriptData];
    await savePacScripts(updatedScripts);
    setShowForm(false);
    setFormData({ name: '', inputType: 'url', url: '', content: '', enabled: true });
  };

  const startEdit = (script) => {
    setEditingScriptId(script.id);
    setEditFormData({
      name: script.name,
      inputType: 'plain', // Always edit as plain since we store content
      url: '',
      content: script.content,
      enabled: script.enabled
    });
  };

  const cancelEdit = () => {
    setEditingScriptId(null);
    setEditFormData({ name: '', inputType: 'url', url: '', content: '', enabled: true });
    setEditValidationError('');
  };

  const saveEdit = async () => {
    const error = validatePacScript(editFormData, editingScriptId);
    
    if (error) {
      setEditValidationError(error);
      return;
    }
    
    setEditValidationError('');
    
    const updatedScripts = pacScripts.map(script => 
      script.id === editingScriptId ? {
        ...script,
        name: editFormData.name.trim(),
        content: editFormData.content.trim(),
        enabled: editFormData.enabled,
        updatedAt: new Date().toISOString()
      } : script
    );
    
    await savePacScripts(updatedScripts);
    setEditingScriptId(null);
    setEditFormData({ name: '', inputType: 'url', url: '', content: '', enabled: true });
  };

    const showDeleteDialog = (script) => {
    setDeleteDialog({ 
      isOpen: true, 
      scriptId: script.id, 
      scriptName: script.name 
    });
  };

  const confirmDelete = async () => {
    const updatedScripts = pacScripts.filter(script => script.id !== deleteDialog.scriptId);
    await savePacScripts(updatedScripts);
    setDeleteDialog({ isOpen: false, scriptId: null, scriptName: '' });
  };

  return (
    <div className="space-y-6">
      {/* PAC Scripts Section */}
      <div>
        {pacScripts.length > 0 && !showForm && (
          <div className="mb-4">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              {messages.addPacScript}
            </button>
          </div>
        )}

        {pacScripts.length === 0 && !showForm ? (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">{messages.noPacScripts}</p>
            <p className="text-sm text-gray-500 mb-4">{messages.configurePacScripts}</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-sm cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              {messages.addPacScript}
            </button>
          </div>
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
                            if (editValidationError) setEditValidationError('');
                          }}
                          placeholder={messages.pacScriptNamePlaceholder}
                          className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 ${
                            editValidationError 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                              : 'border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                        />
                        <textarea
                          value={editFormData.content}
                          onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                          placeholder={messages.pacScriptContentPlaceholder}
                          rows={4}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 resize-none font-mono"
                        />
                        <div className="flex items-center justify-between">
                          <Switch.Group>
                            <div className="flex items-center gap-2">
                              <Switch.Label className="text-sm text-gray-700">
                                {editFormData.enabled ? messages.enabled : messages.disabled}
                              </Switch.Label>
                              <Switch
                                checked={editFormData.enabled}
                                onChange={(enabled) => setEditFormData({ ...editFormData, enabled })}
                                className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${
                                  editFormData.enabled ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
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
                        {editValidationError && (
                          <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                            <ExclamationTriangleIcon className="w-3 h-3 flex-shrink-0" />
                            {editValidationError}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-900 py-1">{script.name}</div>
                    )}
                  </div>
                  
                                     <div className="flex gap-1">
                     {editingScriptId === script.id ? (
                       <>
                         <button onClick={(e) => { e.stopPropagation(); saveEdit(); }} className="p-1 hover:bg-green-100 rounded text-gray-500 hover:text-green-600 cursor-pointer" title="Save">
                           <CheckIcon className="w-4 h-4" />
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-600 cursor-pointer" title="Cancel">
                           <XMarkIcon className="w-4 h-4" />
                         </button>
                       </>
                     ) : (
                       <button onClick={(e) => { e.stopPropagation(); showDeleteDialog(script); }} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 cursor-pointer" title="Delete">
                         <TrashIcon className="w-4 h-4" />
                       </button>
                     )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add PAC Script Form */}
        {showForm && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
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
                    if (validationError) setValidationError('');
                  }}
                  placeholder={messages.pacScriptNamePlaceholder}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                    validationError && validationError.includes('name')
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
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
                      className="text-blue-600 focus:ring-blue-500"
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
                      className="text-blue-600 focus:ring-blue-500"
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
                      if (validationError) setValidationError('');
                    }}
                    placeholder={messages.pacScriptUrlPlaceholder}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                      validationError && validationError.includes('URL')
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
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
                      if (validationError) setValidationError('');
                    }}
                    placeholder={messages.pacScriptContentPlaceholder}
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 resize-none font-mono ${
                      validationError && validationError.includes('content')
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
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
                        formData.enabled ? 'bg-blue-600' : 'bg-gray-200'
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

              {validationError && (
                <div className="text-red-600 text-xs flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-3 h-3 flex-shrink-0" />
                  {validationError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={fetchingScript}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
                    setShowForm(false);
                    setValidationError('');
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
                  {deleteDialog.scriptName}
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
