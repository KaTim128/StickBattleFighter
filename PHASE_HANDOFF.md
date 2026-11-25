# Phase handoff

## Latest (25/11/2026): Batch 6 (Tournament) implemented; Batches 0–5 pushed

- T1–T4 done and build-verified (see `REQUIREMENTS_TRACEABILITY.md`, TD-158). Next: Batch 7 (arena order and Tutorial Zone rename, occlusion fix, curved wall, House Fight mode) after the owner's go-ahead.

## Current handoff (24/11/2026): planning complete, implementation not started

- **Plan:** `STICKMAN_ARENA_IMPLEMENTATION_PLAN.md`, batches 0 to 10, with owner decisions D1 to D8 recorded 24/11/2026.
- **Traceability:** `REQUIREMENTS_TRACEABILITY.md`, every row `todo`.
- **Spec:** `docs/references/master-plan/STICKMAN_ARENA_MASTER_DEVELOPMENT_UPDATE.md`.
- **Reference images:** `docs/references/ui/` (occlusion 1–2, pixel-art office 1–2) and `docs/references/master-plan/` (tournament draw, practice cards).
- **Start here:** Batch 0.
  - The working tree holds uncommitted, half-done Shard Blade / Crystal Monster / Necro edits that do not type-check. Repair them first (R0.1).
  - Crystal Prison is broken in the deployed game: restore `trap`, `legTrapState` and `standable` (R0.2).
- **Protocol:**
  - one batch at a time, each ending with checks, commit, push, a preview deploy and a short report;
  - only browser-checked rows become `gameplay-verified`;
  - after a worker restart, resume from this file plus the traceability file, `git status` and `git log`.

## Current phase

**Phase 0: inspection and planning. Complete; awaiting the owner's approval.** No gameplay was changed in Phase 0.

Separately, before Phase 0 and at the owner's explicit request on 16/11/2026, two gameplay fixes landed: the AI-never-idle work and the blindness changes.

## Completed requirements (Phase 0)

- Project inspected; architecture and real file locations recorded in `docs/ARCHITECTURE_OVERVIEW.md`.
- Implementation plan for Phases 1–4 (task order, files, dependencies, risks, tests, acceptance, review points): `IMPLEMENTATION_PLAN.md`.
- Audio audit:
  - every current fighter sound and its reuse, the tools installed (FFmpeg yes; Pixabay unreachable);
  - the sixteen-fighter coverage plan and the horror ambience check (the three uploads are one identical file);
  - all in `AUDIO_ASSET_CATALOG.md`.
- `FIGHTER_SYSTEM_DEVELOPMENT_GUIDE.md`, `FIGHTER_SYSTEM_CHANGELOG.md`, `STICKMAN_ARENA_VISUAL_STYLE_GUIDE.md`.
- Spec §20A (master plan adopted), open questions OQ-P0-1 to OQ-P0-8 (§21), TD-071, and `CLAUDE.md` rules.
- GitHub failures investigated:
  - runs #154–#158 failed on test expectations behind balance edits (log of #158 checked);
  - runs #159–#160 were cancelled at the CI job's 20-minute limit;
  - the fix is planned as Phase 1 A2.
- The Vexoris poison inconsistency is documented with one proposed interpretation (OQ-P0-3).
- The owner's reference images are stored in `docs/references/master-plan/`:
  - the tournament draw;
  - the Practice cards;
  - the isometric house style;
  - the ability list.

## Modified files (Phase 0)

- **New:** `IMPLEMENTATION_PLAN.md`, `PHASE_HANDOFF.md`, `AUDIO_ASSET_CATALOG.md`, `FIGHTER_SYSTEM_DEVELOPMENT_GUIDE.md`, `FIGHTER_SYSTEM_CHANGELOG.md`, `STICKMAN_ARENA_VISUAL_STYLE_GUIDE.md`, `docs/ARCHITECTURE_OVERVIEW.md`, and `docs/references/master-plan/*`.
- **Updated:** `STICKMAN_ARENA_MASTER_SPEC.md`, `TECHNICAL_DECISIONS.md`, `CLAUDE.md`, `DEVELOPMENT_PROGRESS.md`.

## Important decisions

- New modes get their own scenes (TD-071).
- The status-effect registry comes before bleeding, poison and new fighters.
- Model names stay out of the repository.

## Tests performed

Phase 0 changed documents only. The last code state (`e0a78ae`, AI fixes rebased on the owner's balance commits) was verified:
- `npm run typecheck`, `npm run lint`: clean;
- `npx vitest run`: 498 passed.

## Known problems

- CI exceeds its 20-minute limit (Phase 1 A2).
- Pixabay is unreachable here (OQ-P0-6).

## Outstanding

- Owner answers to OQ-P0-1, 2, 4, 6 and 8 before Phase 1; OQ-P0-3 before Phase 3; OQ-P0-5 before Phase 4; OQ-P0-7 before Phase 2.
- Owner approval of Phase 0.

## Review status

Phase 0 planned and self-audited by the planning/review model (see the self-audit in `DEVELOPMENT_PROGRESS.md`).

## Progress (17/11/2026)

Phase 0 approved (TD-072). Phase 1 **Batch A done** (A1 housekeeping, A2 CI split, A3 per-fighter controls). Batch B (B1 to B18) is next.

## Exact next action

Start **Phase 1 Batch B** with B1, the status-effect registry (`IMPLEMENTATION_PLAN.md` §1); stop at the end of Phase 1 for the owner's consolidated review.
