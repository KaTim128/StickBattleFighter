# Documentation rules

- `STICKMAN_ARENA_MASTER_SPEC.md` is the requirements source of truth. Never delete or weaken a requirement silently: superseded items move to §22 and every edit gets a §23 change-log line with a DD/MM/YYYY date.
- `CLAUDE.md` stays short (project-wide rules only). Procedures go in skills; requirements go in the spec.
- After meaningful work, update `DEVELOPMENT_PROGRESS.md` with: what changed, files, commands run with results, known issues, blocked items, the exact next task, and branch plus commit hash at checkpoints.
- Architecture changes → `TECHNICAL_DECISIONS.md` (new TD entry with context, decision, alternatives, trade-offs, status).
- New features → add verification items to `TESTING_CHECKLIST.md`.
- Ownership or boundary changes → `docs/workflow/SYSTEM_OWNERSHIP.md`.
- Each source folder keeps a short `README.md` stating purpose, owner and key interfaces. Update it when the folder's contract changes.
- Dates DD/MM/YYYY, metric units, any real-money amounts in MYR.
- Never claim something was verified, inspected or watched unless it actually was. State limitations explicitly.
