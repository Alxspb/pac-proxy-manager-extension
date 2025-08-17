export const validateDomain = (domain) => {
  if (!domain || typeof domain !== 'string') {
    return { isValid: false, error: 'domainRequired' };
  }

  const trimmedDomain = domain.trim();
  if (!trimmedDomain) {
    return { isValid: false, error: 'domainRequired' };
  }

  const isWildcardDomain = trimmedDomain.startsWith('*.');
  const domainToValidate = isWildcardDomain ? trimmedDomain.slice(2) : trimmedDomain;

  if (isWildcardDomain && trimmedDomain === '*.') {
    return { isValid: false, error: 'invalidWildcardDomain' };
  }

  if (!domainToValidate) {
    return { isValid: false, error: 'invalidDomainFormat' };
  }

  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!domainRegex.test(domainToValidate)) {
    return { isValid: false, error: 'invalidDomainFormat' };
  }

  const parts = domainToValidate.split('.');
  if (parts.length < 2) {
    return { isValid: false, error: 'domainTooShort' };
  }

  for (const part of parts) {
    if (part.length === 0 || part.length > 63) {
      return { isValid: false, error: 'invalidDomainFormat' };
    }
    if (part.startsWith('-') || part.endsWith('-')) {
      return { isValid: false, error: 'invalidDomainFormat' };
    }
  }

  return { isValid: true, normalizedDomain: trimmedDomain };
};

export const validateDomainList = (domains) => {
  const results = [];
  const validDomains = [];
  const invalidDomains = [];
  
  for (const domain of domains) {
    const validation = validateDomain(domain);
    results.push({
      original: domain,
      ...validation
    });
    
    if (validation.isValid) {
      validDomains.push(validation.normalizedDomain);
    } else {
      invalidDomains.push({
        domain,
        error: validation.error
      });
    }
  }
  
  return {
    results,
    validDomains,
    invalidDomains,
    hasErrors: invalidDomains.length > 0
  };
};
