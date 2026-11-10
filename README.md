# Stickman Arena

An original, browser-based, **fully 3D, real-time, free-movement arena fighting game**.

> **Status:** project initialisation complete (10/11/2026). **No game code yet.** The next milestone is Phase 0: architecture approval and bootstrap of a minimal 3D scene.

## Start here

| Document | Purpose |
|---|---|
| [`STICKMAN_ARENA_MASTER_SPEC.md`](STICKMAN_ARENA_MASTER_SPEC.md) | Authoritative game requirements, open questions (§21) |
| [`CLAUDE.md`](CLAUDE.md) | Project instructions for every Claude Code session (Master Developer role) |
| [`DEVELOPMENT_PROGRESS.md`](DEVELOPMENT_PROGRESS.md) | Current status, active assignments, decisions needing attention |
| [`DEVELOPMENT_ROADMAP.md`](DEVELOPMENT_ROADMAP.md) | Phased, dependency-aware plan with acceptance tests |
| [`TECHNICAL_DECISIONS.md`](TECHNICAL_DECISIONS.md) | Architecture decision log |
| [`TESTING_CHECKLIST.md`](TESTING_CHECKLIST.md) | Verification checklist |
| [`docs/workflow/`](docs/workflow/) | Master Developer workflow, system ownership |
| [`docs/references/`](docs/references/) | Playbook and reference observation reports |

## Claude Code setup
- **Specialists:** `.claude/agents/` (10 subagents: architecture, rendering, physics, combat, character, animation, AI, mobile controls, backend, QA)
- **Rules:** `.claude/rules/`
- **Skills:** `/new-fighter`, `/new-ability`, `/new-arena`, `/bug-investigation`, `/release-check`, `/assign-specialist`, `/session-checkpoint`, `/reference-observation`

If newly added agents or skills are not detected, restart Claude Code in the project folder.

## Proposed stack (awaiting approval)
TypeScript + Vite · Three.js · Rapier · Vitest + Playwright · Blender → glTF. Backend undecided. See `TECHNICAL_DECISIONS.md`.

## Boundaries
Froggy (`froggy-arcade`) is a read-only reference. Reference videos inform presentation only. Stickman Arena is not affiliated with any franchise shown in them.
