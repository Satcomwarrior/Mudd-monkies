# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Upgraded Next.js from 15.0.3 to 16.0.3 to fix critical security vulnerabilities:
  - Fixed DoS vulnerability with Server Actions (GHSA-7m27-7ghc-44w9)
  - Fixed information exposure in dev server (GHSA-3h52-269p-cp9r)
  - Fixed cache key confusion for Image Optimization API (GHSA-g5qg-72qw-gw5v)
  - Fixed content injection vulnerability for Image Optimization (GHSA-xv57-4mr9-wg8v)
  - Fixed improper middleware redirect handling leading to SSRF (GHSA-4342-x723-ch2f)
  - Fixed race condition to cache poisoning (GHSA-qpjv-v59x-3qc4)
  - Fixed authorization bypass in middleware (GHSA-f82v-jwr5-mffw)
- Upgraded pdfjs-dist from 3.11.174 to 5.4.394 to fix high severity vulnerability:
  - Fixed arbitrary JavaScript execution vulnerability when opening malicious PDFs (GHSA-wgrm-67xf-hhpq)

### Added
- Added pdf.js-extract 0.2.1 dependency for PDF text extraction functionality
- Created ESLint 9 flat config (eslint.config.mjs) for proper linting support

### Changed
- Updated eslint-config-next from 15.0.3 to 16.0.3 for compatibility with Next.js 16
- Upgraded ESLint from 8 to 9 for compatibility with Next.js 16
- Updated pdfjs-dist API usage: changed `page.render()` to use `canvas` property instead of deprecated `canvasContext`
- Modified build script to explicitly use webpack mode (`--webpack` flag) for compatibility with canvas aliasing
- Updated lint script to use eslint directly instead of next lint command

### Fixed
- Fixed pdfjs-dist breaking change: Updated render API call in usePdfHandler hook to use new canvas-based rendering
- Added turbopack config to next.config.ts to silence warnings about webpack configuration
- Resolved ESLint 9 configuration issues by creating proper flat config file
