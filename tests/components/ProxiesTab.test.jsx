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

    it('should show add proxy button when no proxies exist', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ proxies: [] });
      mockChrome.runtime.sendMessage.mockResolvedValue({ isActive: false });

      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getByText('Add Proxy')).toBeInTheDocument();
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

      await user.click(screen.getByText('Add Proxy'));

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
    it('should not show activate button when no proxies configured', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ proxies: [] });
      mockChrome.runtime.sendMessage.mockResolvedValue({ isActive: false });

      render(<ProxiesTab />);

      await waitFor(() => {
        expect(screen.getByText('No proxy servers configured')).toBeInTheDocument();
      });

      expect(screen.queryByText('Activate Proxy')).not.toBeInTheDocument();
    });
  });
});
