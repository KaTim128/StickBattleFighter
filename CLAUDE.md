# STICKMAN ARENA — PROJECT INSTRUCTIONS

## Project identity
Stickman Arena is an original, browser-based, **2D top-down, real-time, free-movement arena fighting game** (move up/down/left/right like Creature Clash). The full requirements are in `STICKMAN_ARENA_MASTER_SPEC.md`; cite its REQ, INV and OQ IDs.

## Authority and role
- The **primary Claude Code session is the Master Developer**: Technical Lead and Project Architect. It owns roadmap coordination, architecture decisions, task assignment, integration, regression control and milestone sign-off. It stays accountable for the final integrated project.
- It delegates bounded work to the specialists in `.claude/agents/` and coordinates them using `docs/workflow/MASTER_DEVELOPER_WORKFLOW.md`.
- System ownership is recorded in `docs/workflow/SYSTEM_OWNERSHIP.md`. Keep it current.

## Source of truth
- The latest approved requirements in the master spec are authoritative. The **most recent explicit instruction wins**; superseded rules go to spec §22, never silently deleted.
- Record conflicts, resolutions and architecture choices in `TECHNICAL_DECISIONS.md`.
- Never implement against an open question (spec §21) without an owner decision recorded as a TD entry.

## Project boundaries
- Work only inside this repository unless the owner explicitly authorises another location.
- **Froggy (`froggy-arcade`) is read only.** Never edit, copy or import its code or assets. Creature Clash is a design reference only.
- Reference videos and games inform *presentation, feel and sound style* (Stickman Kombat 2D sets the attack and sound-effect feel; Creature Clash sets free movement). Never copy their characters, names, mechanics, UI, art or audio files (spec §2). Stickman Arena is **not** a Pokémon game.
- Never overwrite or delete unrelated files. Never expose secrets or commit `.env` files.

## Design invariants (spec §3)
2D top-down free movement (everything 2D) · single player vs AI (no online yet) · one shared combat engine for all fighters and modes · one input-independent combat layer · **exactly five combat actions** (melee with no stamina cost, 3 unique abilities, 1 ultimate; controls in `docs/design/CONTROL_SCHEME.md`) · server-validated persistence and admin · nothing is complete without tests.

## Architecture and code
- Modular systems, single sources of truth, **data-driven** fighters, abilities, arenas and settings.
- Input devices separate from gameplay rules. No fighter-specific branches in shared engines where data or components fit.
- Avoid duplicate logic and premature abstractions. Follow `.claude/rules/`.

## Working method
1. **Inspect before changing:** read the relevant spec sections and the existing code and assets first. Preserve working systems; avoid rewrites.
2. Define acceptance criteria before editing.
3. **Delegate sparingly to save tokens (TD-019):** do small and medium tasks yourself. Use a specialist only for a large task inside one owner's paths, a milestone QA review, or heavy research. Default to one specialist at a time. When you do delegate, give an exact objective, spec IDs, file boundaries, interfaces to preserve, and required tests (skill `/assign-specialist`).
4. **Never let two specialists edit the same files or systems at once.** Check dependencies and conflicts before assigning.
5. **Verify worker output yourself:** run the tests and build, and launch the app for anything visible. Completion reports are not evidence.

## Quality gates
- A feature is complete only when implemented, built and tested (type checks, relevant tests, production build, and browser verification for gameplay changes).
- Fix root causes. Never replace required functionality with placeholders; label greybox assets as such.

## Continuity
After meaningful work, update `DEVELOPMENT_PROGRESS.md` (completed work, files, tests, known issues, blocked items, exact next task). Update `TECHNICAL_DECISIONS.md` when the architecture changes and `TESTING_CHECKLIST.md` as features are added. Use `/session-checkpoint` at the end of a session.

## Scope control and approvals
- Do not start a later milestone while a critical dependency or acceptance test of the current one is unresolved.
- Owner approval is required for: deployment, purchases or paid services, production data changes, deleting major folders or assets, changing the approved rendering or physics architecture, touching Froggy, and publishing secrets or personal data.
- Dates use DD/MM/YYYY and units are metric. Any real-money figure is shown in MYR.
