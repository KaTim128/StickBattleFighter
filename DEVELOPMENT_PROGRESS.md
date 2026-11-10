# DEVELOPMENT PROGRESS

Persistent record of project state. Update after every meaningful piece of work (`/session-checkpoint`). **Never mark unverified work complete.**

## Current status

| Item | Value |
|---|---|
| Current phase | **Phase I: Project initialisation: COMPLETE** (10/11/2026) |
| Next milestone | **Phase 0:** architecture approval and bootstrap (minimal 3D scene) |
| Branch | `ccr-6b7ad8fe-whr1i5` |
| Latest commit | see `git log -1` |
| Runnable game | **None yet**, by design (TD-001) |
| Installed dependencies | None |

## Active assignments

Check this table before assigning work. No two active assignments may share a path or system.

| ID | Specialist | Objective | Write paths | Started | Status |
|---|---|---|---|---|---|
| *(none)* | | | | | |

## Completed work

### 10/11/2026: Phase I, project initialisation (Master Developer)

**Reference inspection**
- Read the **entire** playbook v1.2 (`.docx`, 20 sections; converted with pandoc and read in full). The owner uploaded two byte-identical copies of v1.2 plus an earlier v1.0; the v1.0→v1.2 diff is the addition of §4.4 (reference games) and the version number.
- Analysed both gameplay videos frame by frame (ffmpeg; 1 frame per 2 s throughout plus 5 fps bursts around two power attacks). **Audio not analysed.** Report: `docs/references/VIDEO_REFERENCE_OBSERVATIONS.md`.
- Inspected Creature Clash read only in `froggy-arcade` (`CreatureArena.ts`, `specials.ts`, `ultimates.ts`, `creatures.ts`, `creatureClash.ts`). Finding: it is **2D top-down**, not 3D (TD-011). Report: `docs/references/CREATURE_CLASH_OBSERVATIONS.md`. Froggy left unmodified.
- Stickman Kombat 2D: **not inspected** (not provided; public description from the playbook only).

**Files created**
- Root: `STICKMAN_ARENA_MASTER_SPEC.md`, `CLAUDE.md`, `DEVELOPMENT_PROGRESS.md`, `DEVELOPMENT_ROADMAP.md`, `TECHNICAL_DECISIONS.md`, `TESTING_CHECKLIST.md`, `README.md`, `.gitignore`
- `.claude/settings.json` (permissions: deny `.env` access, Froggy edits, force-push, hard reset, `rm -rf`; ask before npm install/uninstall/publish)
- `.claude/agents/`: 10 specialists (architect and QA read only)
- `.claude/rules/`: architecture, coding-standards, documentation, testing, asset-management, performance, security, collaboration, integration, reference-usage
- `.claude/skills/`: new-fighter, new-ability, new-arena, bug-investigation, release-check, assign-specialist, session-checkpoint, reference-observation
- `docs/workflow/MASTER_DEVELOPER_WORKFLOW.md`, `docs/workflow/SYSTEM_OWNERSHIP.md`
- `docs/references/` (playbook copy plus two observation reports), `docs/design/`
- Directory skeleton with an owner README per folder: `src/{app,core,rendering,vfx,camera,physics,input,characters,combat,abilities,animation,arenas,environment,ai,modes,interface,tutorial,progression,services,data/*}`, `backend/`, `assets/*` plus `ASSET_REGISTER.md`, `public/`, `tests/{unit,integration,e2e}`, `tools/`

**Verification performed**
- All agent and skill YAML frontmatter parsed successfully (Python `yaml.safe_load`); required keys present; agent names unique and matching file names.
- `.claude/settings.json` parsed as valid JSON.
- Ownership registry checked: every `src/` folder has exactly one owner; read-only agents (architect, QA) have no Edit/Write tools.
- No source code, fighters, arenas, gameplay systems or assets were created.
- `froggy-arcade` `git status` clean (unmodified).

### 10/11/2026: Owner decisions applied (Master Developer)
Owner answers to the initialisation questions, recorded across spec, TD log, CLAUDE.md, rules, agents, roadmap and checklist:

| Owner answer | Recorded as |
|---|---|
| 1. "Make the controls best suited; I'll let you deal with it" | Control scheme designed: `docs/design/CONTROL_SCHEME.md`, TD-016, REQ-CTL-11..15. Resolves OQ-02, OQ-03, OQ-14. |
| 2. AI players only for now; maybe online later | REQ-VIS-8, TD-018. Resolves OQ-13. |
| 3. Find free hostings | TD-017 (PROPOSED): Cloudflare Pages + Supabase Free; Workers + D1 as alternative; Firebase Spark rejected. Upgrade cost noted in MYR. No accounts or deployments made. |
| 4. Agree with the stack | TD-003 to TD-007 ACCEPTED. |
| 5. Adopt presentation targets | PRS-1..11 and REQ-ABL-6 binding. Resolves OQ-15. |
| 6. Confirm specialists, only when needed to save tokens | TD-009 confirmed; TD-019 token-economy policy in CLAUDE.md and workflow. Resolves OQ-18. |
| 7. Stickman Kombat 2D = style and feel (sound effects, attacks); movement like Creature Clash | Spec §2.1, reference-usage rule, combat agent. Resolves OQ-01. |
| 8. Original requirements not remembered | Spec "Important gap" updated: the playbook-based spec is the baseline. |

**Verification:** agent and skill YAML re-validated; spec open-question table re-checked (4 columns intact).

**Limitation:** official pricing pages (Cloudflare, Supabase) were not reachable from this session's network. Free-tier figures come from third-party 2026 summaries and must be confirmed when accounts are created.

## Decisions requiring owner attention

Full list in spec §21. Still open:

1. **OQ-10:** performance targets and minimum devices. Needed before Phase 1 ends; I can propose defaults if you prefer.
2. **OQ-04, OQ-05:** ultimate rule; stat, stamina and cooldown baselines (Phase 5–6). I can propose balanced defaults for approval.
3. **OQ-06, OQ-07, OQ-08, OQ-09:** match rules, 3v3/ladder/story details, economy numbers, real-money purchases (Phase 13–14).
4. **OQ-12:** sand in the office? **OQ-16:** 3D stickman art direction. **OQ-17:** audio source (original sound effects in the Stickman Kombat 2D style).
5. **TD-017:** approve the free hosting proposal (needed only by Phase 14 or first deployment).

## Known issues
- None in code (no code exists).
- Documentation limitation: numeric gameplay and economy values are absent from the source material (spec §21).

## Outstanding tasks (next)
1. **Phase 0** (stack approved; starts on the owner's go-ahead): Architecture specialist reviews the structure → Master creates `package.json`, TypeScript, Vite, Vitest and Playwright config → minimal Three.js + Rapier scene → smoke tests.
   - **Acceptance:** `npm run typecheck`, `npm test`, `npm run build` exit 0; a Playwright smoke test shows a non-blank WebGL canvas with zero console errors (screenshot saved).
2. Restart Claude Code locally after pulling so the new agents and skills are detected (Playbook §8.12), then smoke-test by asking `stickman-architect` for a read-only review.
