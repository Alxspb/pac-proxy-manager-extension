import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProxiesTab from '../../src/popup/tabs/ProxiesTab.jsx';
import { createMockChrome } from '../mocks/chrome.js';

vi.mock('chrome', () => ({
  default: {}
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
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });
    });

    it('should show toggle as inactive when proxy is not active', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ proxies: [] });
      mockChrome.runtime.sendMessage.mockResolvedValue({ isActive: false });

      render(<ProxiesTab />);

      await waitFor(() => {
        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        expect(toggle).toHaveAttribute('aria-label', 'Activate Proxy');
      });
    });

    it('should show toggle as active when proxy is active', async () => {
      const mockProxies = [{ id: 1, url: 'http://proxy.com:8080' }];
      mockChrome.storage.local.get.mockResolvedValue({ proxies: mockProxies });
      mockChrome.runtime.sendMessage.mockResolvedValue({ isActive: true });

      render(<ProxiesTab />);

      await waitFor(() => {
        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        expect(toggle).toHaveAttribute('aria-label', 'Deactivate Proxy');
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
        expect(screen.getByText(/Invalid URL format/)).toBeInTheDocument();
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

      const toggle = screen.getByRole('switch');
      expect(toggle).toBeDisabled();
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
        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'true');
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
  });
});
