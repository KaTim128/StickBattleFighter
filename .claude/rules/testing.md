---
paths:
  - "src/**"
  - "backend/**"
  - "tests/**"
---
# Testing rules

- **No feature is complete without tests and evidence** (INV-8). A green build alone proves nothing about gameplay.
- Unit tests (Vitest) for deterministic rules: combat maths, stamina, cooldowns, input mapping, data schemas, ledger rules. Put them in `tests/unit/<system>/` mirroring `src/`.
- Integration tests for interactions between systems (combat + physics queries, AI + modes, tutorial + persistence) in `tests/integration/`.
- Browser tests (Playwright) for user flows in `tests/e2e/`. Run with `--trace off` unless debugging a failure. Capture screenshots for visual behaviour; fail on console errors.
- Real-device checks (mobile input, performance) are manual and logged with device, browser and result in `DEVELOPMENT_PROGRESS.md`.
- Every bug fix adds a regression test that fails before the fix.
- Never skip, disable or loosen a test to make a build pass. If a test is wrong, fix it and explain why in the commit.
- Tests must be deterministic: seed randomness, use the fixed simulation step, and avoid real timers.
- Before marking a milestone done: the full suite, previous milestones' acceptance tests, and a QA specialist review.
