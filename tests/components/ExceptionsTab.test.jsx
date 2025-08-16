import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExceptionsTab from '../../src/popup/tabs/ExceptionsTab.jsx';
import { createMockChrome } from '../mocks/chrome.js';

vi.mock('chrome', () => ({
  default: {}
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('ExceptionsTab Component', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockChrome();
    global.chrome = mockChrome;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render exceptions tab with domain input', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: []
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        expect(screen.getByLabelText('Domain to proxy:')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('*.example.com')).toBeInTheDocument();
      });
    });

    it('should show proxy options when domain is provided', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        expect(screen.getByText('PAC')).toBeInTheDocument();
        expect(screen.getByText('Yes')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
      });
    });

    it('should show warning when no proxies are configured', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: []
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        expect(screen.getByText(/require.*prox/i)).toBeInTheDocument();
      });
    });
  });

  describe('Domain Auto-filling', () => {
    it('should auto-fill domain from current tab', async () => {
      mockChrome.tabs.query.mockResolvedValue([{
        active: true,
        url: 'https://example.com/path'
      }]);
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        const domainInput = screen.getByPlaceholderText('*.example.com');
        expect(domainInput).toHaveValue('*.example.com');
      });
    });

    it('should trim www. from domain when auto-filling', async () => {
      mockChrome.tabs.query.mockResolvedValue([{
        active: true,
        url: 'https://www.example.com/path'
      }]);
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        const domainInput = screen.getByPlaceholderText('*.example.com');
        expect(domainInput).toHaveValue('*.example.com');
      });
    });

    it('should not auto-fill for localhost', async () => {
      mockChrome.tabs.query.mockResolvedValue([{
        active: true,
        url: 'http://localhost:3000'
      }]);
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        const domainInput = screen.getByPlaceholderText('*.example.com');
        expect(domainInput).toHaveValue('');
      });
    });

    it('should not auto-fill for chrome extension pages', async () => {
      mockChrome.tabs.query.mockResolvedValue([{
        active: true,
        url: 'chrome-extension://abcdefghijklmnopqrstuvwxyz123456/popup.html'
      }]);
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        const domainInput = screen.getByPlaceholderText('*.example.com');
        expect(domainInput).toHaveValue('');
      });
    });
  });

  describe('Button Disabled State', () => {
    it('should disable all proxy option buttons when domain is empty', async () => {
      const user = userEvent.setup();
      
      // Mock empty tab URL so domain doesn't get auto-filled
      mockChrome.tabs.query.mockResolvedValue([]);
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('*.example.com')).toBeInTheDocument();
      });

      // Ensure domain input is empty
      const domainInput = screen.getByPlaceholderText('*.example.com');
      await user.clear(domainInput);

      await waitFor(() => {
        const pacButton = screen.getByText('PAC').closest('div').parentElement;
        const yesButton = screen.getByText('Yes').closest('div').parentElement;
        const noButton = screen.getByText('No').closest('div').parentElement;

        expect(pacButton).toHaveClass('bg-gray-100');
        expect(pacButton).toHaveClass('cursor-not-allowed');
        expect(yesButton).toHaveClass('bg-gray-100');
        expect(yesButton).toHaveClass('cursor-not-allowed');
        expect(noButton).toHaveClass('bg-gray-100');
        expect(noButton).toHaveClass('cursor-not-allowed');
      });
    });

    it('should enable proxy option buttons when domain has content', async () => {
      const user = userEvent.setup();
      
      // Mock empty tab URL so domain doesn't get auto-filled
      mockChrome.tabs.query.mockResolvedValue([]);
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('*.example.com')).toBeInTheDocument();
      });

      const domainInput = screen.getByPlaceholderText('*.example.com');
      await user.type(domainInput, '*.test.com');

      await waitFor(() => {
        const pacButton = screen.getByText('PAC').closest('div');
        const yesButton = screen.getByText('Yes').closest('div');
        const noButton = screen.getByText('No').closest('div');

        expect(pacButton).toHaveClass('cursor-pointer');
        expect(pacButton).not.toHaveClass('bg-gray-100');
        expect(yesButton).toHaveClass('cursor-pointer');
        expect(yesButton).not.toHaveClass('bg-gray-100');
        expect(noButton).toHaveClass('cursor-pointer');
        expect(noButton).not.toHaveClass('bg-gray-100');
      });
    });

    it('should not save exception when domain is empty and button is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock empty tab URL so domain doesn't get auto-filled
      mockChrome.tabs.query.mockResolvedValue([]);
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /yes/i })).toBeInTheDocument();
      });

      // Ensure domain input is empty
      const domainInput = screen.getByPlaceholderText('*.example.com');
      await user.clear(domainInput);

      // Try to click "Yes" radio when domain is empty
      const yesRadio = screen.getByRole('radio', { name: /yes/i });
      await user.click(yesRadio);

      // Should not have called storage.set
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('Exception Management', () => {
    it('should save exception when domain is provided and option is selected', async () => {
      const user = userEvent.setup();
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('*.example.com')).toBeInTheDocument();
      });

      const domainInput = screen.getByPlaceholderText('*.example.com');
      await user.clear(domainInput);
      await user.type(domainInput, '*.test.com');

      // Use role to be more specific about which "Yes" button
      const yesRadio = screen.getByRole('radio', { name: /yes/i });
      await user.click(yesRadio);

      await waitFor(() => {
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
          domainExceptions: { '*.test.com': 'yes' }
        });
      });
    });

    it('should load and display existing exceptions', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: { '*.example.com': 'yes', '*.test.com': 'no' },
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        expect(screen.getByText('Exceptions')).toBeInTheDocument();
      });
    });

    it('should remove exception when PAC is selected for existing exception', async () => {
      const user = userEvent.setup();
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: { '*.test.com': 'yes' },
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      const domainInput = await waitFor(() => screen.getByPlaceholderText('*.example.com'));
      await user.clear(domainInput);
      await user.type(domainInput, '*.test.com');

      const pacRadio = screen.getByRole('radio', { name: /pac/i });
      await user.click(pacRadio);

      await waitFor(() => {
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
          domainExceptions: {}
        });
      });
    });
  });

  describe('Bulk Import', () => {
    it('should show bulk import section in disclosure', async () => {
      const user = userEvent.setup();
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        expect(screen.getByText('Bulk Import')).toBeInTheDocument();
      });

      const bulkImportButton = screen.getByText('Bulk Import');
      await user.click(bulkImportButton);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /yes/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /no/i })).toBeInTheDocument();
        expect(screen.getByText('Import Exceptions')).toBeInTheDocument();
      });
    });

    it('should disable bulk import button when textarea is empty', async () => {
      const user = userEvent.setup();
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: [{ id: 1, url: 'http://proxy.com:8080' }]
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        expect(screen.getByText('Bulk Import')).toBeInTheDocument();
      });

      const bulkImportButton = screen.getByText('Bulk Import');
      await user.click(bulkImportButton);

      await waitFor(() => {
        const importButton = screen.getByText('Import Exceptions');
        expect(importButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      render(<ExceptionsTab />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('*.example.com')).toBeInTheDocument();
      });
    });

    it('should handle tab query errors gracefully', async () => {
      mockChrome.tabs.query.mockRejectedValue(new Error('Tab query error'));
      
      mockChrome.storage.local.get.mockResolvedValue({ 
        domainExceptions: {},
        proxies: []
      });

      render(<ExceptionsTab />);

      await waitFor(() => {
        const domainInput = screen.getByPlaceholderText('*.example.com');
        expect(domainInput).toHaveValue('');
      });
    });
  });
});
