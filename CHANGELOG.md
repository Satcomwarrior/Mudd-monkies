# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- **CRITICAL**: Upgraded Next.js from 15.0.3 to 15.5.6 to fix multiple critical security vulnerabilities:
  - Fixed Denial of Service (DoS) with Server Actions (GHSA-7m27-7ghc-44w9)
  - Fixed information exposure in dev server due to lack of origin verification (GHSA-3h52-269p-cp9r)
  - Fixed Cache Key Confusion for Image Optimization API Routes (GHSA-g5qg-72qw-gw5v)
  - Fixed Content Injection Vulnerability for Image Optimization (GHSA-xv57-4mr9-wg8v)
  - Fixed Improper Middleware Redirect Handling Leads to SSRF (GHSA-4342-x723-ch2f)
  - Fixed Race Condition to Cache Poisoning (GHSA-qpjv-v59x-3qc4)
  - Fixed Authorization Bypass in Middleware (GHSA-f82v-jwr5-mffw)
- **HIGH**: Upgraded pdfjs-dist from 3.11.174 to 4.10.38 to fix arbitrary JavaScript execution vulnerability (GHSA-wgrm-67xf-hhpq)
- Upgraded eslint-config-next from 15.0.3 to 15.5.6 for compatibility

### Fixed
- Added missing pdf.js-extract dependency required by MCP server tool handler
