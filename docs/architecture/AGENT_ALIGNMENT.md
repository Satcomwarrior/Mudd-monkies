# Agent Alignment Guide

## Repository identity

This repository is the **construction PDF takeoff platform**.

It is not the Always Elevated storefront, a merch/POD project, ClaimSafe, a legal evidence project, or a general-purpose MCP dumping ground.

## Canonical architecture documents

Before making architectural changes, read:

1. `README.md`
2. `docs/architecture/TAKEOFF_PLATFORM_REBUILD_BLUEPRINT.md`
3. `docs/architecture/TOOL_QUALIFICATION_AUDIT.md`
4. `docs/plans/TAKEOFF_PLATFORM_REBUILD_PLAN.md`
5. this file

If a proposed change conflicts with those documents, stop and reconcile the conflict instead of creating a parallel implementation.

## Non-negotiable engineering rules

### One takeoff core

There is one authoritative geometry/calibration/unit/quantity implementation: `packages/takeoff-core`.

Do not create new measurement math in:
- React components
- hooks
- MCP handlers
- Python OCR/CV code
- report generators
- agent scripts

Adapters may translate data into/out of the core, but they must not independently recalculate takeoff quantities.

### Stable coordinates

Persist takeoff geometry in stable PDF/sheet coordinates.

Do not persist rendered canvas pixels as the source of truth.

Zoom level, DPI, browser size, display scaling, and rendering resolution must not change saved quantities.

### Tool qualification

Every production tool must be classified and qualified according to `TOOL_QUALIFICATION_AUDIT.md`.

- Q1: deterministic/core trusted
- Q2: probabilistic/assisted, human confirmation required
- Q3: experimental, not a normal production workflow
- Remove/Extract: does not belong in this product

Do not promote a tool because it appears to work on one sample.

### AI is assistive

OCR/CV/model output is a proposal until accepted by a user or an explicitly documented review workflow.

Never manufacture confidence values.

Always preserve provenance:
- algorithm/model version
- source sheet/region
- confidence when real
- input revision
- review status

### Security boundaries

Production web/MCP operations are project-scoped.

Do not accept arbitrary server filesystem paths from a web client or remote MCP caller.

Use project IDs, sheet IDs, artifact/object keys, and validated schemas.

Local developer-only filesystem tools must be clearly separated from production APIs.

### Construction usefulness over feature count

A tool belongs in the product only when it is useful to an estimator/PM and can be explained accurately.

Do not call text keyword counting “symbol detection.”
Do not call regex title-block checks “blueprint validation.”
Do not call raw OCR tokens “measurements.”

Names must describe actual capability.

### Units are first-class

Every persisted quantity must carry its unit and quantity dimension.

Never add or total incompatible units without explicit conversion.

### Manual takeoff first

The professional manual workflow must remain usable without AI.

AI/CV can accelerate work, but the platform must still support accurate human measurement, correction, review, and audit.

## Change discipline

Before adding a module:
1. search for an existing owner
2. extend the canonical module if appropriate
3. add tests/fixtures
4. document failure modes
5. update qualification status if capability changes

Avoid repository sprawl and duplicate modules.

## Current implementation order

1. takeoff-core modules
2. stable PDF coordinates
3. project persistence
4. manual workstation
5. MCP v3 over application services
6. OCR/CV proposal service
7. assemblies and rollups
8. revision comparison
9. reporting/estimating handoff
10. multi-user hardening

Do not skip ahead by building a second architecture for a later phase.
