# Takeoff Tool Qualification Audit

## Purpose

No tool enters the production takeoff platform merely because it exists or returns output.

Every manual, MCP, OCR, CV, geometry, persistence, and reporting tool must prove:
1. correctness
2. real construction usefulness
3. robustness
4. accuracy
5. safe failure behavior
6. project-scoped security
7. explainability/provenance where inference is involved

## Qualification Classes

- **Q1 Core Trusted:** deterministic, production-safe, known-answer tests pass.
- **Q2 Assisted:** useful but probabilistic; results require human confirmation.
- **Q3 Experimental:** not available as a production workflow.
- **Remove/Extract:** unrelated or fundamentally wrong for this product.

## Existing Tool Audit

| Tool / subsystem | Current finding | Status | Required action |
|---|---|---:|---|
| `echo` | Connection test only, no takeoff value | Q3/dev-only | Keep only as diagnostics or remove from customer-visible tool list |
| `calculate_area` | Shoelace math is correct for simple polygons; tests are good | Q1 candidate | Move into canonical core, runtime schema validation, stable coordinate/calibration IDs |
| `measure_distance` | Euclidean/scaled math is correct; tests cover positive scale | Q1 candidate | Move into canonical core; typed units, calibration provenance, PDF coordinates |
| `pdf_extract_text` | Useful for vector PDFs, not scanned plans; text order may not reflect drawing layout | Q2 | Add page geometry, OCR fallback, bounded file handling, benchmark vector/scanned/hybrid fixtures |
| `validate_blueprint` | Regex checks for title/scale labels, not true blueprint validation | Q3 | Rename to metadata heuristic or replace with structured title-block/scale validation |
| `extract_dimensions` | Regex heuristic; test suite does not require imperial examples to succeed individually; current word-boundary construction is unreliable for strings ending in quotes | Q3 | Build a dimension parser with golden imperial/metric corpus, fractions, architectural notation and normalized units |
| `count_symbols` | Counts symbol *words* in extracted text, not graphical symbols | Q3 | Rename to `count_symbol_keywords` or replace with actual CV symbol detector; never present as visual quantity takeoff |
| `save_takeoff` | Writes arbitrary filesystem paths | Q3 | Replace with project-scoped database persistence |
| `load_takeoff` | Reads arbitrary filesystem paths | Q3 | Replace with project-scoped repository lookup |
| `generate_report` | Generates CSV/text, but totals can combine unlike units | Q3 | Group by quantity type + unit + cost code; add XLSX/PDF; validate schema |
| browser manual line | Straight-line math valid after good calibration | Q1 candidate | Move math to core; save calibration ID/unit with measurement |
| browser polygon area | Basic polygon math valid | Q1 candidate | Move to core; geometry validation, self-intersection handling |
| browser scale calibration | Allows invalid/zero values and uses mutable global state | Q3 | Positive finite validation; sheet/detail calibration records; lock provenance |
| browser measurement labels | Stored value has no own unit; changing current unit can relabel existing values incorrectly | Q3 | Store canonical quantity/unit per annotation and convert explicitly |
| Python `GeometryProcessor` | Duplicates TS geometry; some useful spatial operations | Q3 | Extract useful snap/spatial algorithms or retire duplicate arithmetic |
| Python OCR service | `confidence_threshold` is ignored; returned confidence is hard-coded to 1.0; every OCR token can be emitted as a “measurement” | Q3 | Redesign as proposal service with real confidence and measurement parsing |
| Python OCR tests | Mostly mocks; do not test actual OCR accuracy | Q3 | Add real labeled blueprint fixture benchmark and CI/service integration tests |
| Android MCP server | Device automation, unrelated to construction takeoff | Remove/Extract | Move useful work to canonical mobile-MCP repo; remove from takeoff deployment boundary |

## Critical Findings

### 1. Web API filesystem exposure

`src/app/api/mcp/route.ts` accepts a client-selected `toolName` and forwards request fields directly to `callToolHandler`.

The handler includes tools that accept arbitrary `filePath`, `outputPath`, and `outputDir`. If this route is deployed without another authorization boundary, the HTTP adapter can expose server filesystem read/write behavior that was originally reasonable only for a trusted local stdio MCP client.

**Required:** separate local MCP filesystem tools from web application services. Production web requests use project IDs/object keys only.

### 2. Temporary filename handling

The API builds a temp path from client-supplied `fileName`.

**Required:** create a random temp directory/file or use object storage. Never let a client determine a server filesystem path.

### 3. No runtime request validation in direct API path

The handler uses TypeScript casts. MCP tool schemas do not automatically validate requests that bypass MCP transport and call the handler directly.

**Required:** Zod (or equivalent) validation at the application-service boundary.

### 4. Dimension extraction is heuristic, not qualified measurement extraction

The current test accepts success if *any* known dimension is found. That allows broken architectural/imperial parsing to pass while metric values satisfy the assertion.

**Required golden corpus:**
- 12'-6"
- 12' 6"
- 12'-6 1/2"
- 6 1/2"
- 3'-0"
- 36"
- 3.5 m
- 3500 mm
- 35 cm
- decimal feet if supported
- malformed/noise negatives

Each case must assert normalized value and unit, not substring presence.

### 5. Symbol counting name is inaccurate

Current logic searches extracted text with a regex such as `door(s)?`.

It does not inspect drawing graphics.

**Required:** either rename it clearly to keyword counting or implement visual symbol detection. A construction estimator must never mistake this output for a fixture/door/device count.

### 6. OCR confidence is currently fictitious

`extract_measurements` returns confidence `1.0` for every item and does not apply `confidence_threshold`.

**Required:** do not expose confidence until the underlying detector supplies or derives a validated score.

### 7. Reports can sum incompatible quantities

Area and distance totals currently sum by type without unit normalization/grouping.

**Required:** never add feet to meters, or ft² to m². Normalize explicitly or group totals by unit.

## Production Qualification Gate

### Deterministic geometry
Must pass:
- known-answer unit tests
- property tests
- translation/rotation invariance where applicable
- invalid geometry tests
- unit-conversion tests
- calibration transform tests

Target: numerical results match analytical fixtures within floating-point tolerance.

### End-to-end manual measurement
Use generated/vector fixtures with known dimensions at multiple render scales and rotations.

Promotion target:
- correct saved geometry independent of zoom
- controlled-fixture length/area error target <= 0.25% after valid calibration
- no unit relabeling or calibration drift

This is an acceptance target, not a claim about current accuracy.

### OCR / dimension extraction
Build a labeled benchmark from real plan sheets plus synthetic edge cases.

Track:
- precision
- recall
- normalized-value accuracy
- page localization accuracy
- false positives by notation class

Until benchmark thresholds are established and met, OCR output remains Q2 assisted.

### Symbol detection
Benchmark separately per symbol class.

Track:
- precision
- recall
- duplicate detections
- missed symbols
- scale/rotation sensitivity

No automatic final count until each class is qualified. Human review remains required for Q2.

### Scale detection
A proposed scale must include:
- source text/geometry
- unit
- viewport/detail scope
- confidence
- validation against at least one known dimension when possible

### Persistence/reporting
Must prove:
- project isolation
- schema validation
- revision consistency
- unit-safe rollups
- deterministic exports
- audit history

### Robustness suite
Include:
- corrupt PDF
- encrypted PDF
- 100+ page plan set
- vector-only
- raster-only
- mixed vector/raster
- rotated pages
- unusual page sizes
- large sheets
- missing scale
- multiple scales on one sheet
- concurrent users/jobs

## Tool Review Workflow

Every new or changed tool gets a Tool Qualification Record:

```yaml
name:
owner:
purpose:
qualification: Q1 | Q2 | Q3
inputs:
outputs:
known_failure_modes:
security_scope:
test_fixtures:
accuracy_metrics:
benchmark_version:
model_or_algorithm_version:
last_qualified_at:
```

CI blocks Q1 promotion unless required tests/benchmarks exist.
