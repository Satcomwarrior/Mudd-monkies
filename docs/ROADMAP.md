# Q4 2025 Roadmap Status

Tracking artifact for [issue #10](https://github.com/Satcomwarrior/Mudd-monkies/issues/10) and GitHub milestone **[Q4 2025](https://github.com/Satcomwarrior/Mudd-monkies/milestone/1)**.

This document maps the original Q4 2025 checklist to the current state of `main`. Status is **honest**: items marked Done point at real paths or merged PRs; gaps stay open as follow-up issues on the milestone.

| Status | Meaning |
|--------|---------|
| **Done** | Present on `main` with a concrete pointer |
| **Partial** | Started or adjacent work exists; still incomplete vs the checklist intent |
| **Not started** | No meaningful implementation on `main` |

---

## Key Features

| Item | Status | Notes / pointers |
|------|--------|------------------|
| User profile and authentication system | **Not started** | No auth/session/profile code under `src/`. Follow-up: [#28](https://github.com/Satcomwarrior/Mudd-monkies/issues/28) |
| PDF viewer with guidance panel | **Partial** | Viewer + takeoff measurements: `src/components/PdfViewer.tsx`, `src/hooks/usePdfHandler.ts`. Scale mode has a short inline hint only; no dedicated guidance/help panel. Follow-up: [#29](https://github.com/Satcomwarrior/Mudd-monkies/issues/29) |
| MCP tool for Claude AI integration | **Done** | Standalone MCP server: `mcp-server/` (`src/index.ts`, `src/tool-handler.ts`). App bridge: `src/app/api/mcp/route.ts`. Tools include `pdf_extract_text`, `validate_blueprint`, `measure_distance`, `calculate_area`, takeoff save/load, and report generation. |

---

## Dependency Updates

| Item | Status | Notes / pointers |
|------|--------|------------------|
| Upgrade to Node.js 22 LTS | **Partial** | CI matrix runs Node **20 and 22** (`.github/workflows/ci.yml`). `package.json` `engines.node` is `>=18` (supports 22; not pinned to 22-only). Webpack workflow still uses Node 20.x. |
| Update webpack to v5.x | **Done** | Root `package.json` / lockfile: `webpack` `^5.101.3`. Build script uses `next build --webpack`. |
| Security audit and dependency updates | **Partial** | Critical CVE upgrades landed via [#20](https://github.com/Satcomwarrior/Mudd-monkies/pull/20) / [#21](https://github.com/Satcomwarrior/Mudd-monkies/pull/21) (Next.js **16.0.3**, `pdfjs-dist` **^5.4.394**). Ongoing audit remains a recurring practice, not a one-time checkbox. |
| Review and update all major dependencies | **Partial** | Major stack pieces are current on `main` (Next 16, React 18, TypeScript 5, pdfjs 5). Broader periodic review still applies; no formal audit log checked in. |

---

## Documentation Improvements

| Item | Status | Notes / pointers |
|------|--------|------------------|
| Comprehensive API documentation | **Not started** | MCP tools and `/api/mcp` lack a dedicated API reference. Follow-up: [#30](https://github.com/Satcomwarrior/Mudd-monkies/issues/30) |
| User guides and tutorials | **Not started** | No end-user tutorial beyond README getting-started. Follow-up: [#30](https://github.com/Satcomwarrior/Mudd-monkies/issues/30) |
| Update README with current features | **Partial** | README documents PDF takeoff features, MCP/AI tools, project structure, and repo identity banner. Version labels (e.g. “Next.js 15” in Tech Stack) may lag `package.json`; keep README in sync as features land. |
| Architecture documentation | **Partial** | Research/architecture report: `docs/enterprise-construction-blueprint-takeoff.md`. Contributor docs: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/pull_request_template.md`. Not a short “how this repo is structured in production” guide. |

---

## Release Plan

| Item | Status | Notes / pointers |
|------|--------|------------------|
| v1.0 Beta release (November 2025) | **Not started** | No GitHub tags/releases on the repo. Follow-up: [#31](https://github.com/Satcomwarrior/Mudd-monkies/issues/31) |
| Community feedback period | **Not started** | Depends on Beta tag. Tracked in [#31](https://github.com/Satcomwarrior/Mudd-monkies/issues/31) |
| v1.0 Stable release (December 2025) | **Not started** | No `v1.0.0` (or similar) tag. Follow-up: [#31](https://github.com/Satcomwarrior/Mudd-monkies/issues/31) |

---

## Milestone

- **Milestone:** [Q4 2025](https://github.com/Satcomwarrior/Mudd-monkies/milestone/1) (due 2025-12-31)
- **Parent issue:** [#10](https://github.com/Satcomwarrior/Mudd-monkies/issues/10)

### Follow-up issues (gaps)

| Issue | Topic |
|-------|--------|
| [#28](https://github.com/Satcomwarrior/Mudd-monkies/issues/28) | User profile and authentication |
| [#29](https://github.com/Satcomwarrior/Mudd-monkies/issues/29) | PDF viewer guidance panel polish |
| [#30](https://github.com/Satcomwarrior/Mudd-monkies/issues/30) | API documentation and user guides |
| [#31](https://github.com/Satcomwarrior/Mudd-monkies/issues/31) | v1.0 release checklist (Beta → Stable) |

---

## Explicitly deferred

- Changes to `.github/workflows` (e.g. pinning engines or expanding the webpack Node matrix) are out of scope for the roadmap-tracking PR; workflow follow-ups remain deferred separately.
