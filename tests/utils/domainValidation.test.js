import { describe, it, expect } from 'vitest';
import { validateDomain, validateDomainList } from '../../src/utils/domainValidation.js';

describe('domainValidation', () => {
  describe('validateDomain', () => {
    it('should validate simple domain names', () => {
      const result = validateDomain('example.com');
      expect(result.isValid).toBe(true);
      expect(result.normalizedDomain).toBe('example.com');
    });

    it('should validate wildcard domains', () => {
      const result = validateDomain('*.example.com');
      expect(result.isValid).toBe(true);
      expect(result.normalizedDomain).toBe('*.example.com');
    });

    it('should validate subdomains', () => {
      const result = validateDomain('sub.example.com');
      expect(result.isValid).toBe(true);
      expect(result.normalizedDomain).toBe('sub.example.com');
    });

    it('should validate wildcard subdomains', () => {
      const result = validateDomain('*.sub.example.com');
      expect(result.isValid).toBe(true);
      expect(result.normalizedDomain).toBe('*.sub.example.com');
    });

    it('should handle domains with numbers and hyphens', () => {
      const result = validateDomain('api-v2.example123.com');
      expect(result.isValid).toBe(true);
      expect(result.normalizedDomain).toBe('api-v2.example123.com');
    });

    it('should reject empty domain', () => {
      const result = validateDomain('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('domainRequired');
    });

    it('should reject null domain', () => {
      const result = validateDomain(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('domainRequired');
    });

    it('should reject undefined domain', () => {
      const result = validateDomain(undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('domainRequired');
    });

    it('should reject whitespace-only domain', () => {
      const result = validateDomain('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('domainRequired');
    });

    it('should reject invalid wildcard domain', () => {
      const result = validateDomain('*.');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalidWildcardDomain');
    });

    it('should reject single-part domain', () => {
      const result = validateDomain('localhost');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('domainTooShort');
    });

    it('should reject domain with invalid characters', () => {
      const result = validateDomain('exam_ple.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalidDomainFormat');
    });

    it('should reject domain starting with hyphen', () => {
      const result = validateDomain('-example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalidDomainFormat');
    });

    it('should reject domain ending with hyphen', () => {
      const result = validateDomain('example-.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalidDomainFormat');
    });

    it('should reject domain with consecutive dots', () => {
      const result = validateDomain('example..com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalidDomainFormat');
    });

    it('should reject domain starting with dot', () => {
      const result = validateDomain('.example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalidDomainFormat');
    });

    it('should reject domain ending with dot', () => {
      const result = validateDomain('example.com.');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalidDomainFormat');
    });

    it('should trim whitespace', () => {
      const result = validateDomain('  *.example.com  ');
      expect(result.isValid).toBe(true);
      expect(result.normalizedDomain).toBe('*.example.com');
    });
  });

  describe('validateDomainList', () => {
    it('should validate list of valid domains', () => {
      const domains = ['example.com', '*.test.org', 'api.service.net'];
      const result = validateDomainList(domains);
      
      expect(result.hasErrors).toBe(false);
      expect(result.validDomains).toEqual(['example.com', '*.test.org', 'api.service.net']);
      expect(result.invalidDomains).toEqual([]);
    });

    it('should separate valid and invalid domains', () => {
      const domains = ['example.com', 'invalid_domain', '*.test.org', 'single'];
      const result = validateDomainList(domains);
      
      expect(result.hasErrors).toBe(true);
      expect(result.validDomains).toEqual(['example.com', '*.test.org']);
      expect(result.invalidDomains).toHaveLength(2);
      expect(result.invalidDomains[0].domain).toBe('invalid_domain');
      expect(result.invalidDomains[1].domain).toBe('single');
    });

    it('should handle empty list', () => {
      const result = validateDomainList([]);
      
      expect(result.hasErrors).toBe(false);
      expect(result.validDomains).toEqual([]);
      expect(result.invalidDomains).toEqual([]);
    });

    it('should handle list with only invalid domains', () => {
      const domains = ['invalid_domain', 'another.invalid_', '*.'];
      const result = validateDomainList(domains);
      
      expect(result.hasErrors).toBe(true);
      expect(result.validDomains).toEqual([]);
      expect(result.invalidDomains).toHaveLength(3);
    });

    it('should include error details for invalid domains', () => {
      const domains = ['example.com', 'invalid_domain'];
      const result = validateDomainList(domains);
      
      expect(result.invalidDomains[0]).toEqual({
        domain: 'invalid_domain',
        error: 'invalidDomainFormat'
      });
    });
  });
});
