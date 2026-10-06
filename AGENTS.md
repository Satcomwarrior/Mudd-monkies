# Agent Instructions

This is the construction PDF takeoff platform.

Read `docs/architecture/AGENT_ALIGNMENT.md` before implementation work.

The canonical architecture is defined by:
- `docs/architecture/TAKEOFF_PLATFORM_REBUILD_BLUEPRINT.md`
- `docs/architecture/TOOL_QUALIFICATION_AUDIT.md`
- `docs/plans/TAKEOFF_PLATFORM_REBUILD_PLAN.md`

Critical rules:
- Keep one authoritative takeoff engine in `packages/takeoff-core`.
- Do not duplicate geometry/calibration/unit math in UI, MCP, Python, or reports.
- Persist stable PDF/sheet coordinates, not canvas pixels.
- AI/OCR/CV results are proposals until reviewed.
- Never invent confidence values.
- Production tools must pass the qualification gate.
- Production web/MCP calls must not expose arbitrary filesystem paths.
- Do not misname heuristics as stronger capabilities.
- Never aggregate incompatible units without conversion.
- Keep manual takeoff fully functional without AI.
- Do not add storefront/POD or unrelated project code here.
