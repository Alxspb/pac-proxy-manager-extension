# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-08-17

### Added
- Domain validation for exceptions with support for wildcard domains (*.example.com)
- Toast notifications for validation errors in domain input and bulk import

### Fixed
- Fixed PAC script fetching failures when URLs redirect or have CORS restrictions by adding host permissions and enhanced fetch logic with fallback handling

### Improved
- Enhanced bulk import to filter out invalid domains and provide detailed feedback
- Replaced custom error divs with toast notifications for cleaner, more consistent error messaging across PAC Scripts and Proxies tabs

## [1.0.2] - 2025-08-18

### Fixed
- Clarified proxy toggle logic: toggle now controls user proxies only, not entire system
- Domain exceptions now only apply when user proxies are enabled
- PAC scripts work independently regardless of user proxy toggle state
- Added inline enable/disable toggles for PAC scripts in list view  
- Fixed storage inconsistency between chrome.storage and IndexedDB for PAC scripts
- Updated test suite to reflect new PAC proxy logic and architecture
- Fixed PAC script toggles incorrectly affecting user proxy switch - systems now operate independently

### Improved
- Optimized PAC script editing to only reload script content when URL changes, preventing unnecessary network requests and improving performance
- Enable/disable switch in PAC script editing now takes effect immediately without requiring form submission, providing better user feedback and interaction
- Added enable/disable toggle switches directly in PAC script list view for quick status changes without entering edit mode