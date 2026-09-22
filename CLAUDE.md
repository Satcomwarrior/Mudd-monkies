# Claude Repository Guidance

Follow `AGENTS.md` and `docs/architecture/AGENT_ALIGNMENT.md` as the canonical instructions.

Do not create an alternate measurement engine, alternate product architecture, or a separate takeoff repository.

When implementing:
1. use `packages/takeoff-core` for deterministic takeoff math
2. add known-answer tests
3. preserve units, calibration provenance, and stable PDF coordinates
4. classify tools Q1/Q2/Q3 before presenting them as production-ready
5. keep probabilistic AI output reviewable and provenance-rich
