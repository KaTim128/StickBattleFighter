---
name: bug-investigation
description: Reproduce a Stickman Arena bug, trace the root cause, implement the smallest reliable fix, add a regression test and verify browser behaviour. Use for any defect report.
---
# Bug investigation

## Inputs required
Problem (exact symptom) · reproduction steps · expected result · actual result. If any are missing, gather them first.

## Steps
1. **Reproduce** the bug yourself (test, script or browser). If you cannot reproduce it, report what you tried; do not patch blindly.
2. **Trace** the execution flow: state, input intents, timing (fixed step and animation events), physics contacts and queries, event ownership. Identify the owning system (`docs/workflow/SYSTEM_OWNERSHIP.md`).
3. **Explain the root cause** in two or three sentences with file:line evidence.
4. **Write a failing regression test** that captures the bug.
5. **Implement the smallest reliable fix** in the owning system (delegate to its owner if it is not yours). No unrelated refactors.
6. Run the regression test (now passing), the related suites, typecheck and build.
7. **Verify in the running browser** when the bug is visible or interactive; check nearby functionality for regressions.
8. Record it in `DEVELOPMENT_PROGRESS.md` (symptom, cause, fix, test, evidence).

## Acceptance checks
- [ ] Root cause identified with evidence (not just the symptom suppressed)
- [ ] Regression test fails before and passes after
- [ ] No new failures; build passes; browser verified
