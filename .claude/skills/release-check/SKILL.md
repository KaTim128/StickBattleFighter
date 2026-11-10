---
name: release-check
description: Run the Stickman Arena release-readiness procedure - production build, full test suite, security checks, asset checks, browser smoke tests, performance evidence and known-issue review - and produce a PASS/FAIL report. Use before any milestone sign-off or proposed release.
---
# Release check

Run by the Master Developer, with `qa-specialist` providing an independent read-only review.

## Steps
1. `git status` is clean; record the branch and commit hash.
2. `npm run typecheck`, `npm test`, `npm run build`. All must exit 0. Record the output.
3. `npm run e2e -- --trace off`: browser smoke and milestone flows; zero console errors; screenshots saved.
4. **Security:** dependency audit; search the diff and bundle for secrets; confirm no client-trusted rewards, unlocks or admin paths; `.env` files ignored.
5. **Assets:** asset validation tests pass; `assets/ASSET_REGISTER.md` complete; no unlicensed or greybox assets marked final.
6. **Invariants:** five combat actions only; desktop has no mobile controls; mobile shows joystick plus exactly five buttons; Froggy untouched.
7. **Performance:** frame rate, memory, load time and input latency on target devices vs budgets (OQ-10); record device details.
8. **Checklist:** walk the relevant sections of `TESTING_CHECKLIST.md`; every ticked item has evidence.
9. **Known issues:** list them with severity; any critical or high issue → FAIL.
10. Run `qa-specialist` for an independent review and include its verdict.

## Output
A report with a PASS/FAIL verdict, evidence per step, open issues and required follow-ups. **Deployment is never part of this skill**; it needs explicit owner approval.
