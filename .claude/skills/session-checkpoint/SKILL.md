---
name: session-checkpoint
description: End-of-session checkpoint for Stickman Arena - update progress, roadmap, technical decisions and testing checklist with verified evidence, branch and commit hash, and the exact next task. Use before ending any working session.
---
# Session checkpoint

1. `git status` and `git log -1`: record the branch and latest commit hash.
2. Update `DEVELOPMENT_PROGRESS.md`:
   - completed (verified, with evidence), partial, blocked and not-started work
   - files changed
   - exact test commands and pass/fail results
   - known bugs with reproduction steps
   - Active Assignments table accurate (nothing left "in progress" by accident)
   - **the exact next task** with target files and acceptance criteria
3. Update the `DEVELOPMENT_ROADMAP.md` status markers.
4. Update `TECHNICAL_DECISIONS.md` if anything architectural changed.
5. Update `TESTING_CHECKLIST.md` for new features.
6. **Never mark unverified work complete.**
7. Commit the documentation updates and push to the working branch.
8. Give the owner a concise handoff summary.
