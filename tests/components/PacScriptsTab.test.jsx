import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PacScriptsTab from '../../src/popup/tabs/PacScriptsTab.jsx';
import { createMockChrome } from '../mocks/chrome.js';
import indexedDBStorage from '../../src/utils/indexedDB';
import toast from 'react-hot-toast';

// Mock IndexedDB storage
vi.mock('../../src/utils/indexedDB', () => ({
  default: {
    getPacScripts: vi.fn(),
    addPacScript: vi.fn(),
    updatePacScript: vi.fn(),
    deletePacScript: vi.fn(),
    savePacScripts: vi.fn()
  }
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

vi.mock('chrome', () => ({
  default: {}
}));

// Mock fetch for PAC script URLs
global.fetch = vi.fn();

describe('PacScriptsTab Component', () => {
  let mockChrome;
  let user;

  beforeEach(() => {
    mockChrome = createMockChrome();
    global.chrome = mockChrome;
    user = userEvent.setup();
    
    // Reset mocks
    vi.clearAllMocks();
    indexedDBStorage.getPacScripts.mockResolvedValue([]);
    indexedDBStorage.addPacScript.mockResolvedValue();
    indexedDBStorage.updatePacScript.mockResolvedValue();
    indexedDBStorage.deletePacScript.mockResolvedValue();
    
    // Mock chrome.runtime.sendMessage to handle getProxyStatus action
    mockChrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.action === 'getProxyStatus') {
        return Promise.resolve({
          isActive: false,
          settings: { 
            value: { mode: 'direct' },
            levelOfControl: 'controllable_by_this_extension'
          },
          isBlocked: false
        });
      }
      return Promise.resolve({ isActive: false });
    });
    
    // Mock fetch
    fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('function FindProxyForURL(url, host) { return "DIRECT"; }')
    });
  });

  describe('Initial State', () => {
    it('should render empty state when no PAC scripts exist', async () => {
      render(<PacScriptsTab />);

      // Now shows form instead of empty state message
      await waitFor(() => {
        expect(screen.getByText('Adding PAC script')).toBeInTheDocument(); // Form header
        expect(screen.getByText('Script Name')).toBeInTheDocument(); // Form field
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument(); // Form buttons
      });
      
      // Should not show the old empty state message
      expect(screen.queryByText('No PAC scripts configured')).not.toBeInTheDocument();
    });

    it('should display existing PAC scripts', async () => {
      const mockScripts = [
        {
          id: 1,
          name: 'Test Script',
          content: 'function FindProxyForURL() { return "DIRECT"; }',
          enabled: true,
          sourceType: 'plain',
          sourceUrl: null
        },
        {
          id: 2,
          name: 'URL Script',
          content: 'function FindProxyForURL() { return "PROXY proxy.com:8080"; }',
          enabled: false,
          sourceType: 'url',
          sourceUrl: 'http://example.com/proxy.pac'
        }
      ];

      indexedDBStorage.getPacScripts.mockResolvedValue(mockScripts);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Script')).toBeInTheDocument();
        expect(screen.getByText('URL Script')).toBeInTheDocument();
        expect(screen.getByText('plain')).toBeInTheDocument();
        expect(screen.getByText('url')).toBeInTheDocument();
      });
    });
  });

  describe('PAC script Creation', () => {
    it('should create a plain PAC script', async () => {
      render(<PacScriptsTab />);

      // Wait for skeleton to disappear and form to be visible
      await waitFor(() => {
        expect(screen.getByText('Adding PAC script')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Adding PAC script'));

      // Fill in the form
      await user.type(screen.getByPlaceholderText('My PAC script'), 'Test Script');
      
      // Select plain text option
      await user.click(screen.getByLabelText('Plain'));
      
      // Fill in content
      const contentArea = screen.getByPlaceholderText(/function FindProxyForURL/);
      await user.clear(contentArea);
      await user.type(contentArea, 'function FindProxyForURL(url, host) [[ return "DIRECT"; ]]');

      // Submit form
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(indexedDBStorage.addPacScript).toHaveBeenCalledWith({
          id: expect.any(Number),
          name: 'Test Script',
          content: 'function FindProxyForURL(url, host) [ return "DIRECT"; ]]',
          enabled: true,
          sourceType: 'plain',
          sourceUrl: null,
          createdAt: expect.any(String)
        });
      });
    });

    it('should create a URL-based PAC script', async () => {
      render(<PacScriptsTab />);

      // Wait for skeleton to disappear and form to be visible
      await waitFor(() => {
        expect(screen.getByText('Adding PAC script')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Adding PAC script'));

      // Fill in the form
      await user.type(screen.getByPlaceholderText('My PAC script'), 'URL Script');
      
      // URL is selected by default, fill in URL
      await user.type(
        screen.getByPlaceholderText('http://example.com/proxy.pac'), 
        'http://example.com/test.pac'
      );

      // Submit form
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://example.com/test.pac', expect.objectContaining({
          method: 'GET',
          redirect: 'follow',
          mode: 'cors'
        }));
        expect(indexedDBStorage.addPacScript).toHaveBeenCalledWith({
          id: expect.any(Number),
          name: 'URL Script',
          content: 'function FindProxyForURL(url, host) { return "DIRECT"; }',
          enabled: true,
          sourceType: 'url',
          sourceUrl: 'http://example.com/test.pac',
          createdAt: expect.any(String)
        });
      });
    });

    it('should handle fetch errors when creating URL-based script', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Error response')
      });
      
      render(<PacScriptsTab />);

      // Wait for skeleton to disappear and form to be visible
      await waitFor(() => {
        expect(screen.getByText('Adding PAC script')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Adding PAC script'));
      await user.type(screen.getByPlaceholderText('My PAC script'), 'Failed Script');
      await user.type(
        screen.getByPlaceholderText('http://example.com/proxy.pac'), 
        'http://example.com/nonexistent.pac'
      );

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch PAC script'));
      });

      expect(indexedDBStorage.addPacScript).not.toHaveBeenCalled();
    });
  });

  describe('PAC script Reload Functionality', () => {
    beforeEach(() => {
      const urlScript = {
        id: 1,
        name: 'URL Script',
        content: 'function FindProxyForURL() { return "DIRECT"; }',
        enabled: true,
        sourceType: 'url',
        sourceUrl: 'http://example.com/proxy.pac'
      };
      
      const plainScript = {
        id: 2,
        name: 'Plain Script', 
        content: 'function FindProxyForURL() { return "DIRECT"; }',
        enabled: true,
        sourceType: 'plain',
        sourceUrl: null
      };

      indexedDBStorage.getPacScripts.mockResolvedValue([urlScript, plainScript]);
    });

    it('should show reload button only for URL-based scripts', async () => {
      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
        expect(screen.getByText('Plain Script')).toBeInTheDocument();
      });

      // Should have one reload button (for URL script only)
      const reloadButtons = screen.getAllByTitle('Reload from URL');
      expect(reloadButtons).toHaveLength(1);
    });

    it('should reload URL-based PAC script when reload button is clicked', async () => {
      const updatedContent = 'function FindProxyForURL(url, host) { return "PROXY updated.com:8080"; }';
      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(updatedContent)
      });

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
      });

      // Click reload button
      const reloadButton = screen.getByTitle('Reload from URL');
      await user.click(reloadButton);

      // Should fetch from URL and update script
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://example.com/proxy.pac', expect.objectContaining({
          method: 'GET',
          redirect: 'follow',
          mode: 'cors'
        }));
        expect(indexedDBStorage.updatePacScript).toHaveBeenCalledWith({
          id: 1,
          name: 'URL Script',
          content: updatedContent,
          enabled: true,
          sourceType: 'url',
          sourceUrl: 'http://example.com/proxy.pac',
          updatedAt: expect.any(String)
        });
      });

      // Should notify background script
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'pacScriptsUpdated'
      });
    });

    it('should handle reload errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Error response')
      });

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
      });

      const reloadButton = screen.getByTitle('Reload from URL');
      await user.click(reloadButton);

      // Wait for the fetch to complete and error to be handled
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://example.com/proxy.pac', expect.objectContaining({
          method: 'GET',
          redirect: 'follow',
          mode: 'cors'
        }));
      });

      // Should not update script on error
      expect(indexedDBStorage.updatePacScript).not.toHaveBeenCalled();
    });

    it('should disable reload button while reloading', async () => {
      let resolvePromise;
      const slowFetch = new Promise(resolve => {
        resolvePromise = resolve;
      });

      fetch.mockReturnValueOnce(slowFetch);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
      });

      const reloadButton = screen.getByTitle('Reload from URL');
      await user.click(reloadButton);

      // Button should be disabled while loading
      await waitFor(() => {
        expect(reloadButton).toHaveClass('opacity-50', 'cursor-not-allowed');
      });

      // Complete the fetch
      resolvePromise({
        ok: true,
        text: () => Promise.resolve('updated content')
      });

      // Button should be enabled again
      await waitFor(() => {
        expect(reloadButton).not.toHaveClass('opacity-50', 'cursor-not-allowed');
      });
    });
  });

  describe('PAC script List View Toggle', () => {
    it('should display toggle switch for each script in list view', async () => {
      const mockScripts = [
        {
          id: 1,
          name: 'Enabled Script',
          content: 'content1',
          enabled: true,
          sourceType: 'plain',
          sourceUrl: null
        },
        {
          id: 2,
          name: 'Disabled Script',
          content: 'content2',
          enabled: false,
          sourceType: 'url',
          sourceUrl: 'http://example.com/proxy.pac'
        }
      ];

      indexedDBStorage.getPacScripts.mockResolvedValue(mockScripts);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('Enabled Script')).toBeInTheDocument();
        expect(screen.getByText('Disabled Script')).toBeInTheDocument();
      });

      // Should have toggle switches for both scripts
      const toggles = screen.getAllByRole('switch');
      expect(toggles).toHaveLength(2);

      // First toggle should be enabled (checked)
      expect(toggles[0]).toBeChecked();
      // Second toggle should be disabled (unchecked)
      expect(toggles[1]).not.toBeChecked();
    });

    it('should immediately toggle script status when clicked in list view', async () => {
      const mockScripts = [
        {
          id: 1,
          name: 'Test Script 1',
          content: 'content1',
          enabled: true,
          sourceType: 'plain',
          sourceUrl: null
        },
        {
          id: 2,
          name: 'Test Script 2',
          content: 'content2',
          enabled: false,
          sourceType: 'url',
          sourceUrl: 'http://example.com/test.pac'
        }
      ];

      indexedDBStorage.getPacScripts.mockResolvedValue(mockScripts);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Script 1')).toBeInTheDocument();
        expect(screen.getByText('Test Script 2')).toBeInTheDocument();
      });

      const toggles = screen.getAllByRole('switch');
      expect(toggles[0]).toBeChecked(); // First script enabled
      expect(toggles[1]).not.toBeChecked(); // Second script disabled

      // Click the first toggle to disable it
      await user.click(toggles[0]);

      // Should immediately update the database
      await waitFor(() => {
        expect(indexedDBStorage.updatePacScript).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 1,
            enabled: false,
            updatedAt: expect.any(String)
          })
        );
      });

      // Should notify background script
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'pacScriptsUpdated'
      });
    });

    it('should handle list toggle errors gracefully by reverting state', async () => {
      const mockScript = {
        id: 1,
        name: 'Test Script',
        content: 'content',
        enabled: true,
        sourceType: 'plain',
        sourceUrl: null
      };

      indexedDBStorage.getPacScripts.mockResolvedValue([mockScript]);
      indexedDBStorage.updatePacScript.mockRejectedValueOnce(new Error('Database error'));

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Script')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch');
      expect(toggle).toBeChecked();

      // Click the toggle (this will fail)
      await user.click(toggle);

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update PAC script status');
      });

      // Should revert UI state back to original
      await waitFor(() => {
        expect(toggle).toBeChecked(); // Should be back to enabled
      });
    });

    it('should prevent edit mode when clicking toggle switch', async () => {
      const mockScripts = [
        {
          id: 1,
          name: 'Test Script',
          content: 'content',
          enabled: true,
          sourceType: 'plain',
          sourceUrl: null
        }
      ];

      indexedDBStorage.getPacScripts.mockResolvedValue(mockScripts);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Script')).toBeInTheDocument();
      });

      // Click the toggle switch - should NOT trigger edit mode
      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      // Should update the script status
      await waitFor(() => {
        expect(indexedDBStorage.updatePacScript).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: false
          })
        );
      });

      // Should still be in list view (not edit mode)
      // Edit mode would show input fields, but we should still see the script name as text
      expect(screen.getByText('Test Script')).toBeInTheDocument();
      
      // Should not see edit mode input field
      const inputField = screen.queryByDisplayValue('Test Script');
      expect(inputField).not.toBeInTheDocument();
    });

    it('should update optimistically and show immediate visual feedback', async () => {
      const mockScript = {
        id: 1,
        name: 'Test Script',
        content: 'content',
        enabled: false,
        sourceType: 'plain',
        sourceUrl: null
      };

      // Mock a slow database update
      let resolveUpdate;
      const slowUpdate = new Promise(resolve => {
        resolveUpdate = resolve;
      });
      indexedDBStorage.updatePacScript.mockReturnValueOnce(slowUpdate);

      indexedDBStorage.getPacScripts.mockResolvedValue([mockScript]);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Script')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeChecked();

      // Click the toggle
      await user.click(toggle);

      // Should immediately show as enabled (optimistic update)
      await waitFor(() => {
        expect(toggle).toBeChecked();
      });

      // Complete the database update
      resolveUpdate();
      await waitFor(() => {
        expect(indexedDBStorage.updatePacScript).toHaveBeenCalled();
      });

      // Should still be enabled
      expect(toggle).toBeChecked();
    });
  });

  describe('PAC script Editing', () => {
    it('should edit URL-based script by editing URL', async () => {
      const urlScript = {
        id: 1,
        name: 'URL Script',
        content: 'old content',
        enabled: true,
        sourceType: 'url',
        sourceUrl: 'http://example.com/old.pac'
      };

      indexedDBStorage.getPacScripts.mockResolvedValue([urlScript]);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
      });

      // Click on script to edit
      await user.click(screen.getByText('URL Script'));

      // Should show URL input for URL-based scripts
      const urlInput = screen.getByDisplayValue('http://example.com/old.pac');
      expect(urlInput).toBeInTheDocument();

      // Should not show content textarea for URL scripts
      expect(screen.queryByDisplayValue('old content')).not.toBeInTheDocument();

      // Change URL
      await user.clear(urlInput);
      await user.type(urlInput, 'http://example.com/new.pac');

      // Save changes
      const saveButton = screen.getByTitle('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://example.com/new.pac', expect.objectContaining({
          method: 'GET',
          redirect: 'follow',
          mode: 'cors'
        }));
        expect(indexedDBStorage.updatePacScript).toHaveBeenCalledWith(
          expect.objectContaining({
            sourceUrl: 'http://example.com/new.pac'
          })
        );
      });
    });

    it('should not fetch content when editing URL-based script without changing URL', async () => {
      const urlScript = {
        id: 1,
        name: 'URL Script',
        content: 'existing content',
        enabled: true,
        sourceType: 'url',
        sourceUrl: 'http://example.com/proxy.pac'
      };

      indexedDBStorage.getPacScripts.mockResolvedValue([urlScript]);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
      });

      // Click on script to edit
      await user.click(screen.getByText('URL Script'));

      // Change only the name, not the URL
      const nameInput = screen.getByDisplayValue('URL Script');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Script Name');

      // URL should remain the same
      const urlInput = screen.getByDisplayValue('http://example.com/proxy.pac');
      expect(urlInput).toBeInTheDocument();

      // Save changes
      const saveButton = screen.getByTitle('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(indexedDBStorage.updatePacScript).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Script Name',
            content: 'existing content', // Should use existing content, not fetch new
            sourceUrl: 'http://example.com/proxy.pac'
          })
        );
      });

      // Should not fetch from URL since URL didn't change
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch content when URL changes during edit', async () => {
      const urlScript = {
        id: 1,
        name: 'URL Script',
        content: 'old content',
        enabled: true,
        sourceType: 'url',
        sourceUrl: 'http://example.com/old.pac'
      };

      const newContent = 'new fetched content';
      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(newContent)
      });

      indexedDBStorage.getPacScripts.mockResolvedValue([urlScript]);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
      });

      // Click on script to edit
      await user.click(screen.getByText('URL Script'));

      // Change URL
      const urlInput = screen.getByDisplayValue('http://example.com/old.pac');
      await user.clear(urlInput);
      await user.type(urlInput, 'http://example.com/new.pac');

      // Save changes
      const saveButton = screen.getByTitle('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://example.com/new.pac', expect.objectContaining({
          method: 'GET',
          redirect: 'follow',
          mode: 'cors'
        }));
        expect(indexedDBStorage.updatePacScript).toHaveBeenCalledWith(
          expect.objectContaining({
            content: newContent, // Should use newly fetched content
            sourceUrl: 'http://example.com/new.pac'
          })
        );
      });
    });

    it('should preserve existing content when editing enabled status without URL change', async () => {
      const urlScript = {
        id: 1,
        name: 'URL Script',
        content: 'preserved content',
        enabled: true,
        sourceType: 'url',
        sourceUrl: 'http://example.com/proxy.pac'
      };

      indexedDBStorage.getPacScripts.mockResolvedValue([urlScript]);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
      });

      // Click on script to edit
      await user.click(screen.getByText('URL Script'));

      // Toggle the enabled status
      const enabledToggle = screen.getByRole('switch');
      await user.click(enabledToggle);

      // Save changes
      const saveButton = screen.getByTitle('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(indexedDBStorage.updatePacScript).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'preserved content', // Should preserve existing content
            enabled: false, // Should reflect the toggle change
            sourceUrl: 'http://example.com/proxy.pac'
          })
        );
      });

      // Should not fetch since URL didn't change
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should immediately save enabled status when toggle is clicked during edit', async () => {
      const urlScript = {
        id: 1,
        name: 'URL Script',
        content: 'test content',
        enabled: true,
        sourceType: 'url',
        sourceUrl: 'http://example.com/proxy.pac'
      };

      indexedDBStorage.getPacScripts.mockResolvedValue([urlScript]);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
      });

      // Click on script to edit
      await user.click(screen.getByText('URL Script'));

      // Toggle the enabled status
      const enabledToggle = screen.getByRole('switch');
      await user.click(enabledToggle);

      // Should immediately save without waiting for submit button
      await waitFor(() => {
        expect(indexedDBStorage.updatePacScript).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 1,
            enabled: false,
            updatedAt: expect.any(String)
          })
        );
      });

      // Should notify background script immediately
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'pacScriptsUpdated'
      });
    });

    it('should handle immediate toggle errors gracefully by reverting UI state', async () => {
      const urlScript = {
        id: 1,
        name: 'URL Script',
        content: 'test content',
        enabled: true,
        sourceType: 'url',
        sourceUrl: 'http://example.com/proxy.pac'
      };

      indexedDBStorage.getPacScripts.mockResolvedValue([urlScript]);
      indexedDBStorage.updatePacScript.mockRejectedValueOnce(new Error('Database error'));

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
      });

      // Click on script to edit
      await user.click(screen.getByText('URL Script'));

      // Verify toggle is initially enabled
      const enabledToggle = screen.getByRole('switch');
      expect(enabledToggle).toBeChecked();

      // Toggle the enabled status (this will fail)
      await user.click(enabledToggle);

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update PAC script status');
      });

      // Should revert UI state back to original
      await waitFor(() => {
        expect(enabledToggle).toBeChecked(); // Should be back to enabled
      });
    });

    it('should work independently from submit button', async () => {
      const urlScript = {
        id: 1,
        name: 'URL Script',
        content: 'test content',
        enabled: true,
        sourceType: 'url',
        sourceUrl: 'http://example.com/proxy.pac'
      };

      indexedDBStorage.getPacScripts.mockResolvedValue([urlScript]);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
      });

      // Click on script to edit
      await user.click(screen.getByText('URL Script'));

      // Toggle enabled status without submitting
      const enabledToggle = screen.getByRole('switch');
      await user.click(enabledToggle);

      // Should have saved immediately
      await waitFor(() => {
        expect(indexedDBStorage.updatePacScript).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: false
          })
        );
      });

      // Cancel editing without submitting
      const cancelButton = screen.getByTitle('Cancel');
      await user.click(cancelButton);

      // Verify the change persisted even after cancel
      await waitFor(() => {
        expect(screen.getByText('URL Script')).toBeInTheDocument();
      });

      // The script should still be disabled in the UI
      expect(indexedDBStorage.updatePacScript).toHaveBeenCalledTimes(1);
    });

    it('should edit plain script by editing content', async () => {
      const plainScript = {
        id: 1,
        name: 'Plain Script',
        content: 'old content',
        enabled: true,
        sourceType: 'plain',
        sourceUrl: null
      };

      indexedDBStorage.getPacScripts.mockResolvedValue([plainScript]);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('Plain Script')).toBeInTheDocument();
      });

      // Click on script to edit
      await user.click(screen.getByText('Plain Script'));

      // Should show content textarea for plain scripts
      const contentArea = screen.getByDisplayValue('old content');
      expect(contentArea).toBeInTheDocument();

      // Change content
      await user.clear(contentArea);
      await user.type(contentArea, 'new content');

      // Save changes
      const saveButton = screen.getByTitle('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(indexedDBStorage.updatePacScript).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'new content',
            sourceType: 'plain'
          })
        );
      });

      // Should not fetch from URL for plain scripts
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('PAC script Deletion', () => {
    it('should delete PAC script', async () => {
      const mockScript = {
        id: 1,
        name: 'Test Script',
        content: 'content',
        enabled: true,
        sourceType: 'plain'
      };

      indexedDBStorage.getPacScripts.mockResolvedValue([mockScript]);

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Script')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByTitle('Delete');
      await user.click(deleteButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Delete Proxy')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(indexedDBStorage.deletePacScript).toHaveBeenCalledWith(1);
        expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
          action: 'pacScriptsUpdated'
        });
      });
    });
  });

  describe('Auto-show Form', () => {
    it('should automatically show form when there are no PAC scripts', async () => {
      render(<PacScriptsTab />);

      // Form should be automatically visible when no scripts exist
      await waitFor(() => {
        expect(screen.getByText('Script Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('My PAC script')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      // The "Adding PAC script" text exists as form header, but not as a separate button
      expect(screen.getByText('Adding PAC script')).toBeInTheDocument(); // Form header
      expect(screen.queryByRole('button', { name: 'Adding PAC script' })).not.toBeInTheDocument(); // No separate button
    });
  });

  describe('Proxy Control Warning', () => {
    it('should not show warning when this extension has control', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'getProxyStatus') {
          return Promise.resolve({
            isActive: true,
            settings: { 
              value: { mode: 'pac_script' },
              levelOfControl: 'controlled_by_this_extension'
            },
            isBlocked: false
          });
        }
        return Promise.resolve({ isActive: false });
      });

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('PAC scripts')).toBeInTheDocument();
      });

      // Should not show warning when not blocked
      expect(screen.queryByText('Another Extension Controls Proxy')).not.toBeInTheDocument();
    });

    it('should show warning when another extension controls proxy', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'getProxyStatus') {
          return Promise.resolve({
            isActive: false,
            settings: { 
              value: { mode: 'pac_script' },
              levelOfControl: 'controlled_by_other_extensions'
            },
            isBlocked: true
          });
        }
        return Promise.resolve({ isActive: false });
      });

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('Another Extension Controls Proxy')).toBeInTheDocument();
        expect(screen.getByText(/Another browser extension is currently controlling/)).toBeInTheDocument();
        expect(screen.getByText(/Disable other proxy extensions/)).toBeInTheDocument();
      });
    });

    it('should not show warning when no extension controls proxy', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'getProxyStatus') {
          return Promise.resolve({
            isActive: false,
            settings: { 
              value: { mode: 'direct' },
              levelOfControl: 'controllable_by_this_extension'
            },
            isBlocked: false
          });
        }
        return Promise.resolve({ isActive: false });
      });

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('PAC scripts')).toBeInTheDocument();
      });

      // Should not show warning when no other extension controls proxy
      expect(screen.queryByText('Another Extension Controls Proxy')).not.toBeInTheDocument();
    });

    it('should handle proxy status error gracefully', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'getProxyStatus') {
          return Promise.reject(new Error('Failed to get proxy status'));
        }
        return Promise.resolve({ isActive: false });
      });

      render(<PacScriptsTab />);

      await waitFor(() => {
        expect(screen.getByText('PAC scripts')).toBeInTheDocument();
      });

      // Should not show warning when proxy status check fails
      expect(screen.queryByText('Another Extension Controls Proxy')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate script name is required', async () => {
      render(<PacScriptsTab />);

      // Wait for skeleton to disappear and form to be visible
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      // Form should be automatically visible when no scripts exist
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(indexedDBStorage.addPacScript).not.toHaveBeenCalled();
      });
    });

    it('should validate URL is required for URL-based scripts', async () => {
      render(<PacScriptsTab />);

      // Wait for skeleton to disappear and form to be visible
      await waitFor(() => {
        expect(screen.getByPlaceholderText('My PAC script')).toBeInTheDocument();
      });

      // Form should be automatically visible when no scripts exist
      await user.type(screen.getByPlaceholderText('My PAC script'), 'Test');
      // URL input is empty
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(indexedDBStorage.addPacScript).not.toHaveBeenCalled();
      });
    });

    it('should validate content is required for plain scripts', async () => {
      render(<PacScriptsTab />);

      // Wait for skeleton to disappear and form to be visible
      await waitFor(() => {
        expect(screen.getByPlaceholderText('My PAC script')).toBeInTheDocument();
      });

      // Form should be automatically visible when no scripts exist
      await user.type(screen.getByPlaceholderText('My PAC script'), 'Test');
      await user.click(screen.getByLabelText('Plain'));
      // Content is empty
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(indexedDBStorage.addPacScript).not.toHaveBeenCalled();
      });
    });
  });
});
