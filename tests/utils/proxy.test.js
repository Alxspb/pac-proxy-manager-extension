import { describe, it, expect } from 'vitest'

class ProxyUtils {
  static validateProxyUrl(url) {
    if (!url || !url.trim()) {
      return 'URL is required'
    }

    const trimmedUrl = url.trim()
    
    try {
      const parsedUrl = new URL(trimmedUrl)
      
      if (!['http:', 'https:', 'socks4:', 'socks5:'].includes(parsedUrl.protocol)) {
        return 'Only HTTP, HTTPS, SOCKS4, and SOCKS5 protocols are supported'
      }
      
      if (!parsedUrl.hostname) {
        return 'Hostname is required'
      }
      
      if (parsedUrl.port) {
        const port = parseInt(parsedUrl.port)
        if (isNaN(port) || port < 1 || port > 65535) {
          return 'Port must be between 1 and 65535'
        }
      }
      
      return null
    } catch (error) {
      return 'Invalid URL format'
    }
  }

  static formatProxyForPAC(proxyUrl) {
    try {
      const url = new URL(proxyUrl)
      const protocol = url.protocol === 'https:' ? 'HTTPS' : 'PROXY'
      const port = url.port || (url.protocol === 'https:' ? '443' : '80')
      return `${protocol} ${url.hostname}:${port}`
    } catch (e) {
      return `PROXY ${proxyUrl}`
    }
  }

  static checkDomainMatch(domain, host) {
    if (domain.startsWith('*.')) {
      const baseDomain = domain.slice(2)
      return host === baseDomain || host.endsWith('.' + baseDomain)
    }
    return domain === host
  }
}

describe('Proxy Utilities', () => {
  describe('URL Validation', () => {
    it('should validate correct HTTP URLs', () => {
      expect(ProxyUtils.validateProxyUrl('http://proxy.example.com:8080')).toBeNull()
      expect(ProxyUtils.validateProxyUrl('http://proxy.example.com')).toBeNull()
    })

    it('should validate correct HTTPS URLs', () => {
      expect(ProxyUtils.validateProxyUrl('https://secure-proxy.example.com:443')).toBeNull()
      expect(ProxyUtils.validateProxyUrl('https://secure-proxy.example.com')).toBeNull()
    })

    it('should validate SOCKS URLs', () => {
      expect(ProxyUtils.validateProxyUrl('socks4://socks.example.com:1080')).toBeNull()
      expect(ProxyUtils.validateProxyUrl('socks5://socks.example.com:1080')).toBeNull()
    })

    it('should reject empty URLs', () => {
      expect(ProxyUtils.validateProxyUrl('')).toBe('URL is required')
      expect(ProxyUtils.validateProxyUrl('   ')).toBe('URL is required')
      expect(ProxyUtils.validateProxyUrl(null)).toBe('URL is required')
    })

    it('should reject unsupported protocols', () => {
      expect(ProxyUtils.validateProxyUrl('ftp://ftp.example.com:21')).toBe('Only HTTP, HTTPS, SOCKS4, and SOCKS5 protocols are supported')
      expect(ProxyUtils.validateProxyUrl('ws://websocket.example.com:80')).toBe('Only HTTP, HTTPS, SOCKS4, and SOCKS5 protocols are supported')
    })

    it('should reject invalid ports', () => {
      expect(ProxyUtils.validateProxyUrl('http://proxy.example.com:0')).toBe('Port must be between 1 and 65535')
      expect(ProxyUtils.validateProxyUrl('http://proxy.example.com:65536')).toBe('Invalid URL format')
      expect(ProxyUtils.validateProxyUrl('http://proxy.example.com:abc')).toBe('Invalid URL format')
    })

    it('should reject malformed URLs', () => {
      expect(ProxyUtils.validateProxyUrl('not-a-url')).toBe('Invalid URL format')
      expect(ProxyUtils.validateProxyUrl('http:///')).toBe('Invalid URL format')
    })
  })

  describe('PAC Formatting', () => {
    it('should format HTTP proxies correctly', () => {
      expect(ProxyUtils.formatProxyForPAC('http://proxy.example.com:8080')).toBe('PROXY proxy.example.com:8080')
      expect(ProxyUtils.formatProxyForPAC('http://proxy.example.com')).toBe('PROXY proxy.example.com:80')
    })

    it('should format HTTPS proxies correctly', () => {
      expect(ProxyUtils.formatProxyForPAC('https://secure.example.com:443')).toBe('HTTPS secure.example.com:443')
      expect(ProxyUtils.formatProxyForPAC('https://secure.example.com')).toBe('HTTPS secure.example.com:443')
    })

    it('should handle malformed URLs gracefully', () => {
      expect(ProxyUtils.formatProxyForPAC('not-a-url')).toBe('PROXY not-a-url')
    })
  })

  describe('Domain Matching', () => {
    it('should match exact domains', () => {
      expect(ProxyUtils.checkDomainMatch('example.com', 'example.com')).toBe(true)
      expect(ProxyUtils.checkDomainMatch('example.com', 'different.com')).toBe(false)
    })

    it('should match wildcard domains', () => {
      expect(ProxyUtils.checkDomainMatch('*.example.com', 'example.com')).toBe(true)
      expect(ProxyUtils.checkDomainMatch('*.example.com', 'api.example.com')).toBe(true)
      expect(ProxyUtils.checkDomainMatch('*.example.com', 'sub.api.example.com')).toBe(true)
      expect(ProxyUtils.checkDomainMatch('*.example.com', 'different.com')).toBe(false)
      expect(ProxyUtils.checkDomainMatch('*.example.com', 'notexample.com')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(ProxyUtils.checkDomainMatch('*.com', 'example.com')).toBe(true)
      expect(ProxyUtils.checkDomainMatch('*.com', 'com')).toBe(true)
      expect(ProxyUtils.checkDomainMatch('*.example.com', 'example.com.evil.com')).toBe(false)
    })
  })
})
