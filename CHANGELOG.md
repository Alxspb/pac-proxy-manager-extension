# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-01-28

### Added
- Domain validation for exceptions with support for wildcard domains (*.example.com)
- Toast notifications for validation errors in domain input and bulk import

### Fixed
- Fixed PAC script fetching failures when URLs redirect or have CORS restrictions by adding host permissions and enhanced fetch logic with fallback handling

### Improved
- Enhanced bulk import to filter out invalid domains and provide detailed feedback
- Replaced custom error divs with toast notifications for cleaner, more consistent error messaging across PAC Scripts and Proxies tabs
