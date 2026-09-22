# Gemini Repository Guidance

Follow `AGENTS.md` and `docs/architecture/AGENT_ALIGNMENT.md`.

This repository is the construction PDF takeoff platform.

Do not:
- introduce storefront/POD concerns
- duplicate takeoff math outside `packages/takeoff-core`
- treat canvas pixels as persisted geometry
- present OCR/CV guesses as verified takeoff
- expose arbitrary filesystem paths through production APIs
- promote unqualified tools

Use the current rebuild plan and tool qualification audit as controlling documents.
