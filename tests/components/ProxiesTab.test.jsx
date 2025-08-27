import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProxiesTab from '../../src/popup/tabs/ProxiesTab.jsx';
import { createMockChrome } from '../mocks/chrome.js';
import toast from 'react-hot-toast';

vi.mock('chrome', () => ({
  default: {}
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

describe('ProxiesTab Component', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockChrome();
    global.chrome = mockChrome;
  });

  describe('Initial State', () => {
    it('should render proxy toggle', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ proxies: [] });
      mockChrome.runtime.sendMessage.mockResolvedValue({ isActive: false });

      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getAllByRole('switch')).toHaveLength(1); // Only proxy toggle when no proxies exist
      });
    });

    it('should show toggle as inactive when proxy is not active', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ proxies: [] });
      mockChrome.runtime.sendMessage.mockResolvedValue({ isActive: false });

      render(<ProxiesTab />);

      await waitFor(() => {
        const proxyToggle = screen.getByRole('switch', { name: /Activate Proxy/ });
        expect(proxyToggle).toHaveAttribute('aria-checked', 'false');
        expect(proxyToggle).toHaveAttribute('aria-label', 'Activate Proxy');
      });
    });

    it('should show toggle as active when proxy is active', async () => {
      const mockProxies = [{ id: 1, url: 'http://proxy.com:8080' }];
      mockChrome.storage.local.get.mockResolvedValue({ proxies: mockProxies });
      mockChrome.runtime.sendMessage.mockResolvedValue({ isActive: true });

      render(<ProxiesTab />);

      await waitFor(() => {
        const proxyToggle = screen.getByRole('switch', { name: /Deactivate Proxy/ });
        expect(proxyToggle).toHaveAttribute('aria-checked', 'true');
        expect(proxyToggle).toHaveAttribute('aria-label', 'Deactivate Proxy');
      });
    });

    it('should show add proxy form when no proxies exist', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ proxies: [] });
      mockChrome.runtime.sendMessage.mockResolvedValue({ isActive: false });

      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getByText('Add Proxy')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('http://proxy.example.com:8080')).toBeInTheDocument();
      });
    });
  });

  describe('Proxy Management', () => {
    it('should display existing proxies', async () => {
      const mockProxies = [
        { id: 1, url: 'http://proxy1.com:8080' },
        { id: 2, url: 'https://proxy2.com:443' }
      ];

      mockChrome.storage.local.get.mockResolvedValue({ proxies: mockProxies });
      mockChrome.runtime.sendMessage.mockResolvedValue({ isActive: false });

      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getByText('http://proxy1.com:8080')).toBeInTheDocument();
        expect(screen.getByText('https://proxy2.com:443')).toBeInTheDocument();
      });
    });

    it('should validate proxy URL format', async () => {
      const user = userEvent.setup();
      mockChrome.storage.local.get.mockResolvedValue({ proxies: [] });
      mockChrome.runtime.sendMessage.mockResolvedValue({ isActive: false });

      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getByText('Add Proxy')).toBeInTheDocument();
      });

      const urlInput = screen.getByPlaceholderText('http://proxy.example.com:8080');
      await user.type(urlInput, 'not-a-valid-url');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Invalid URL format'));
      });
    });
  });

  describe('Proxy Activation', () => {
    it('should show form directly when no proxies configured', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ proxies: [] });
      mockChrome.runtime.sendMessage.mockResolvedValue({ isActive: false });

      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getByText('Add Proxy')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('http://proxy.example.com:8080')).toBeInTheDocument();
      });

      const proxyToggle = screen.getByRole('switch', { name: /Activate Proxy/ });
      expect(proxyToggle).toBeDisabled();
    });

    it('should automatically activate proxy when first proxy is added', async () => {
      const user = userEvent.setup();
      
      mockChrome.storage.local.get.mockResolvedValue({ proxies: [] });
      mockChrome.runtime.sendMessage.mockImplementation((request) => {
        if (request.action === 'getProxyStatus') {
          return Promise.resolve({ isActive: false });
        }
        if (request.action === 'activateProxy') {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getByText('Add Proxy')).toBeInTheDocument();
      });

      const urlInput = screen.getByPlaceholderText('http://proxy.example.com:8080');
      await user.type(urlInput, 'http://proxy.example.com:8080');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ 
          action: 'activateProxy',
          proxies: [
            expect.objectContaining({
              url: 'http://proxy.example.com:8080',
              id: expect.any(Number)
            })
          ]
        });
      });

      await waitFor(() => {
        const proxyToggle = screen.getByRole('switch', { name: /Deactivate Proxy/ });
        expect(proxyToggle).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('should not automatically activate proxy when adding subsequent proxies', async () => {
      const user = userEvent.setup();
      const existingProxies = [{ id: 1, url: 'http://existing-proxy.com:8080' }];
      
      mockChrome.storage.local.get.mockResolvedValue({ proxies: existingProxies });
      mockChrome.runtime.sendMessage.mockImplementation((request) => {
        if (request.action === 'getProxyStatus') {
          return Promise.resolve({ isActive: false });
        }
        return Promise.resolve(false);
      });

      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getByText('http://existing-proxy.com:8080')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: '' });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add Proxy')).toBeInTheDocument();
      });

      const urlInput = screen.getByPlaceholderText('http://proxy.example.com:8080');
      await user.type(urlInput, 'http://second-proxy.com:8080');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
          proxies: [
            existingProxies[0],
            expect.objectContaining({
              url: 'http://second-proxy.com:8080',
              id: expect.any(Number)
            })
          ]
        });
      });

      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalledWith({ action: 'activateProxy' });
    });

    it('should automatically deactivate proxy when last proxy is deleted', async () => {
      const user = userEvent.setup();
      const singleProxy = [{ id: 1, url: 'http://proxy.com:8080' }];
      
      mockChrome.storage.local.get.mockResolvedValue({ proxies: singleProxy });
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'getProxyStatus') {
          return Promise.resolve({ isActive: true, overridePacScript: true });
        }
        if (message.action === 'deactivateProxy') {
          return Promise.resolve(true);
        }
        return Promise.resolve(true);
      });
      mockChrome.storage.local.set.mockResolvedValue();

      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getByText('http://proxy.com:8080')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByTitle('Delete');
      await user.click(deleteButton);

      // Confirm deletion in dialog
      await waitFor(() => {
        expect(screen.getByText('Delete Proxy')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Delete');
      await user.click(confirmButton);

      await waitFor(() => {
        // Should call deactivateProxy since this was the last proxy and proxy was active
        expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'deactivateProxy' });
      });
    });
  });

  describe('PAC Script Override Switch', () => {
    beforeEach(() => {
      // Setup default responses
      mockChrome.storage.local.get.mockResolvedValue({ 
        proxies: [{ id: 1, url: 'http://proxy:8080' }]
      });
      mockChrome.runtime.sendMessage.mockResolvedValue({ 
        isActive: true,
        overridePacScript: true
      });
    });

    it('should not render PAC script override switch when no proxies exist', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ proxies: [] });
      mockChrome.runtime.sendMessage.mockResolvedValue({ 
        isActive: false,
        overridePacScript: true
      });

      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getAllByRole('switch')).toHaveLength(1); // Only proxy toggle
        expect(screen.queryByText('Override PAC Scripts')).not.toBeInTheDocument();
      });
    });

    it('should render PAC script override switch when proxies exist', async () => {
      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getAllByRole('switch')).toHaveLength(2); // Proxy toggle and PAC override toggle
        const overrideSwitch = screen.getAllByRole('switch')[1]; // Second switch
        expect(overrideSwitch).toBeInTheDocument();
        expect(overrideSwitch).toHaveAttribute('aria-checked', 'true');
        expect(overrideSwitch).toHaveAttribute('aria-label', 'Override PAC Scripts');
      });
    });

    it('should show override switch as disabled when setting is false', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ 
        isActive: true,
        overridePacScript: false
      });

      render(<ProxiesTab />);

      await waitFor(() => {
        const overrideSwitch = screen.getAllByRole('switch')[1];
        expect(overrideSwitch).toHaveAttribute('aria-checked', 'false');
      });
    });

    it('should toggle PAC script override setting when clicked', async () => {
      mockChrome.storage.local.set.mockResolvedValue();
      
      render(<ProxiesTab />);
      
      const user = userEvent.setup();

      await waitFor(() => {
        const overrideSwitch = screen.getAllByRole('switch')[1];
        expect(overrideSwitch).toBeInTheDocument();
      });

      const overrideSwitch = screen.getAllByRole('switch')[1];
      await user.click(overrideSwitch);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ 
        overridePacScript: false 
      });
    });

    it('should display correct labels and description for override switch', async () => {
      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getByText('Override PAC Scripts')).toBeInTheDocument();
        expect(screen.getByText(/When enabled, proxy servers will override PAC script results/)).toBeInTheDocument();
      });
    });
  });
});
