import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AboutTab from '../../src/popup/tabs/AboutTab.jsx';
import { createMockChrome } from '../mocks/chrome.js';

describe('AboutTab Component', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockChrome();
    global.chrome = mockChrome;
    
    // Mock runtime.getManifest
    mockChrome.runtime.getManifest = vi.fn(() => ({
      version: '1.0.0'
    }));

    // Mock getUILanguage to return English by default
    mockChrome.i18n.getUILanguage = vi.fn(() => 'en-US');
    
    vi.clearAllMocks();
    
    // Set up default English messages after clearing mocks
    const enMessages = {
      'appName': 'PAC Proxy Manager',
      'aboutDescription': 'Take control of your browsing experience with intelligent proxy management. Free, open source, and easy to use.',
      'aboutMadeBy': 'Made with ❤️ by',
      'aboutSupportAuthor': 'Support the author:',
      'aboutSupportLink': 'buymeacoffee.com/ilyachase',
      'aboutSupportUrl': 'https://buymeacoffee.com/ilyachase',
      'aboutSourceCode': 'Source code:',
      'aboutSourceCodeLink': 'pac-proxy-manager'
    };
    mockChrome.i18n.getMessage.mockImplementation((key) => enMessages[key] || key);
  });

  describe('Basic Rendering', () => {
    it('should render the AboutTab component', async () => {
      render(<AboutTab />);
      
      await waitFor(() => {
        expect(screen.getByText(/PAC Proxy Manager/)).toBeInTheDocument();
      });
    });

    it('should display the version from manifest', async () => {
      render(<AboutTab />);
      
      await waitFor(() => {
        expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
      });
    });

    it('should display the main description', async () => {
      render(<AboutTab />);
      
      await waitFor(() => {
        expect(screen.getByText(/Take control of your browsing experience/)).toBeInTheDocument();
      });
    });
  });

  describe('GitHub Profile Link', () => {
    it('should render the "Made by" section with GitHub profile link', async () => {
      render(<AboutTab />);
      
      await waitFor(() => {
        const profileLink = screen.getByRole('link', { name: /Ilya L\./i });
        expect(profileLink).toBeInTheDocument();
        expect(profileLink).toHaveAttribute('href', 'https://github.com/ilyachase');
        expect(profileLink).toHaveAttribute('target', '_blank');
        expect(profileLink).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  describe('Source Code Link', () => {
    it('should render the source code section with GitHub repository link', async () => {
      render(<AboutTab />);
      
      await waitFor(() => {
        const sourceCodeLink = screen.getByRole('link', { name: /pac-proxy-manager/i });
        expect(sourceCodeLink).toBeInTheDocument();
        expect(sourceCodeLink).toHaveAttribute('href', 'https://github.com/ilyachase/pac-proxy-manager-extension');
        expect(sourceCodeLink).toHaveAttribute('target', '_blank');
        expect(sourceCodeLink).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('should display the GitHub icon', async () => {
      render(<AboutTab />);
      
      await waitFor(() => {
        const githubIcon = screen.getByAltText('GitHub');
        expect(githubIcon).toBeInTheDocument();
        expect(githubIcon).toHaveAttribute('src', '/icons/github.svg');
      });
    });
  });

  describe('Support Link - English Locale', () => {
    it('should display BMC icon and link for English locale', async () => {
      mockChrome.i18n.getUILanguage.mockReturnValue('en-US');
      
      render(<AboutTab />);
      
      await waitFor(() => {
        const bmcIcon = screen.getByAltText('Buy Me Coffee');
        expect(bmcIcon).toBeInTheDocument();
        expect(bmcIcon).toHaveAttribute('src', '/icons/bmc-logo.svg');
        
        const supportLink = screen.getByRole('link', { name: /buymeacoffee\.com\/ilyachase/i });
        expect(supportLink).toBeInTheDocument();
      });
    });
  });

  describe('Support Link - Russian Locale', () => {
    it('should display Boosty icon and link for Russian locale', async () => {
      mockChrome.i18n.getUILanguage.mockReturnValue('ru');
      // Update the mock to return Russian locale messages
      const ruMessages = {
        'appName': 'Менеджер PAC Прокси',
        'aboutDescription': 'Теперь ваш сёрфинг в интернете под контролем благодаря интеллектуальному управлению прокси. Бесплатно, с открытым исходным кодом и просто в использовании.',
        'aboutMadeBy': 'Создано с ❤️ автором',
        'aboutSupportAuthor': 'Поддержать:',
        'aboutSupportLink': 'boosty.to/ilyachase',
        'aboutSupportUrl': 'https://boosty.to/ilyachase',
        'aboutSourceCode': 'Исходный код:',
        'aboutSourceCodeLink': 'pac-proxy-manager'
      };
      mockChrome.i18n.getMessage.mockImplementation((key) => ruMessages[key] || key);
      
      render(<AboutTab />);
      
      await waitFor(() => {
        const boostyIcon = screen.getByAltText('Boosty');
        expect(boostyIcon).toBeInTheDocument();
        expect(boostyIcon).toHaveAttribute('src', '/icons/boosty.svg');
        
        const supportLink = screen.getByRole('link', { name: /boosty\.to\/ilyachase/i });
        expect(supportLink).toBeInTheDocument();
      });
    });
  });

  describe('Localization', () => {
    it('should load and display localized messages', async () => {
      render(<AboutTab />);
      
      await waitFor(() => {
        // Check that i18n.getMessage was called for each expected key
        expect(mockChrome.i18n.getMessage).toHaveBeenCalledWith('appName');
        expect(mockChrome.i18n.getMessage).toHaveBeenCalledWith('aboutDescription');
        expect(mockChrome.i18n.getMessage).toHaveBeenCalledWith('aboutMadeBy');
        expect(mockChrome.i18n.getMessage).toHaveBeenCalledWith('aboutSupportAuthor');
        expect(mockChrome.i18n.getMessage).toHaveBeenCalledWith('aboutSupportLink');
        expect(mockChrome.i18n.getMessage).toHaveBeenCalledWith('aboutSupportUrl');
        expect(mockChrome.i18n.getMessage).toHaveBeenCalledWith('aboutSourceCode');
        expect(mockChrome.i18n.getMessage).toHaveBeenCalledWith('aboutSourceCodeLink');
      });
    });

    it('should call getUILanguage to determine locale', async () => {
      render(<AboutTab />);
      
      await waitFor(() => {
        expect(mockChrome.i18n.getUILanguage).toHaveBeenCalled();
      });
    });
  });

  describe('Component Structure', () => {
    it('should have proper component structure with correct classes', async () => {
      render(<AboutTab />);
      
      await waitFor(() => {
        const container = screen.getByText(/PAC Proxy Manager/).closest('.space-y-6');
        expect(container).toBeInTheDocument();
        
        const contentBox = screen.getByText(/PAC Proxy Manager/).closest('.bg-gray-50');
        expect(contentBox).toBeInTheDocument();
        expect(contentBox).toHaveClass('relative', 'rounded-md', 'p-4', 'bg-gray-50', 'border', 'border-gray-100');
      });
    });

    it('should have proper spacing between sections', async () => {
      render(<AboutTab />);
      
      await waitFor(() => {
        const textContainer = screen.getByText(/Take control of your browsing experience/).closest('.space-y-2');
        expect(textContainer).toBeInTheDocument();
        expect(textContainer).toHaveClass('text-gray-600', 'text-sm', 'space-y-2');
      });
    });
  });

  describe('Icon Switching Logic', () => {
    it('should switch to BMC icon for non-Russian locales', async () => {
      mockChrome.i18n.getUILanguage.mockReturnValue('de-DE');
      // Keep the English messages for non-Russian locales
      const enMessages = {
        'appName': 'PAC Proxy Manager',
        'aboutDescription': 'Take control of your browsing experience with intelligent proxy management. Free, open source, and easy to use.',
        'aboutMadeBy': 'Made with ❤️ by',
        'aboutSupportAuthor': 'Support the author:',
        'aboutSupportLink': 'buymeacoffee.com/ilyachase',
        'aboutSupportUrl': 'https://buymeacoffee.com/ilyachase',
        'aboutSourceCode': 'Source code:',
        'aboutSourceCodeLink': 'pac-proxy-manager'
      };
      mockChrome.i18n.getMessage.mockImplementation((key) => enMessages[key] || key);
      
      render(<AboutTab />);
      
      await waitFor(() => {
        const bmcIcon = screen.getByAltText('Buy Me Coffee');
        expect(bmcIcon).toBeInTheDocument();
        expect(bmcIcon).toHaveAttribute('src', '/icons/bmc-logo.svg');
      });
    });

    it('should switch to Boosty icon for Russian-based locales', async () => {
      mockChrome.i18n.getUILanguage.mockReturnValue('ru-RU');
      // Update the mock to return Russian locale messages
      const ruMessages = {
        'appName': 'Менеджер PAC Прокси',
        'aboutDescription': 'Теперь ваш сёрфинг в интернете под контролем благодаря интеллектуальному управлению прокси. Бесплатно, с открытым исходным кодом и просто в использовании.',
        'aboutMadeBy': 'Создано с ❤️ автором',
        'aboutSupportAuthor': 'Поддержать:',
        'aboutSupportLink': 'boosty.to/ilyachase',
        'aboutSupportUrl': 'https://boosty.to/ilyachase',
        'aboutSourceCode': 'Исходный код:',
        'aboutSourceCodeLink': 'pac-proxy-manager'
      };
      mockChrome.i18n.getMessage.mockImplementation((key) => ruMessages[key] || key);
      
      render(<AboutTab />);
      
      await waitFor(() => {
        const boostyIcon = screen.getByAltText('Boosty');
        expect(boostyIcon).toBeInTheDocument();
        expect(boostyIcon).toHaveAttribute('src', '/icons/boosty.svg');
      });
    });
  });
});
