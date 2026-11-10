# Integration rules

- Cross-system work starts with a **contract** (types or interface in `src/core/` or a short doc) agreed by the owners and approved by the Master Developer.
- Integration is done by the Master Developer, who resolves interface mismatches and never keeps two competing implementations.
- Before merging: typecheck, the full test suite and the production build pass; for visible or interactive changes, the Master runs the game in a browser and inspects it (screenshots, console).
- Specialist completion reports are inputs, not proof. The Master re-runs the verification personally.
- Integrate in small, reviewable steps; commit each verified step with a clear message referencing spec IDs.
- After integration: update progress, testing checklist, ownership (if boundaries changed) and TD log (if architecture changed).
- Regressions found during integration block the milestone until fixed at the root cause.
