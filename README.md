# Stickman Arena

An original, browser-based, **2D top-down, real-time arena fighting game**: fighters move freely up, down, left and right across the arena.

> **Status:** Phase 0 complete (10/11/2026): toolchain plus a minimal 2D top-down engine-check scene (renderer + physics). No gameplay yet. Next: Phase 1, engine foundation.

## Run it locally
Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev          # start the game at http://localhost:5173
npm run typecheck    # TypeScript checks
npm test             # unit + integration tests (Vitest)
npm run build        # production build into dist/
npx playwright install chromium   # once per machine, for browser tests
npm run e2e          # browser smoke tests (desktop + mobile emulation)
```

## Publishing (GitHub Pages)
Deployment is manual and needs the owner's go-ahead. Enable it once under **Settings → Pages → Source: GitHub Actions**, then run the **Deploy to GitHub Pages** workflow from the Actions tab. The game then appears at `https://<owner>.github.io/StickBattleFighter/`. GitHub Pages is free for public repositories.

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
- **Specialists:** `.claude/agents/` (10 subagents: architecture, 2D rendering, physics, combat, character, animation, AI, mobile controls, backend, QA)
- **Rules:** `.claude/rules/`
- **Skills:** `/new-fighter`, `/new-ability`, `/new-arena`, `/bug-investigation`, `/release-check`, `/assign-specialist`, `/session-checkpoint`, `/reference-observation`

If newly added agents or skills are not detected, restart Claude Code in the project folder.

## Stack
TypeScript + Vite · PixiJS 8 (2D) · Rapier 2D · Vitest + Playwright (TD-021). Game hosting: GitHub Pages. Data backend for Phase 14: Supabase Free (proposed). See `TECHNICAL_DECISIONS.md`.

## Boundaries
Froggy (`froggy-arcade`) is a read-only reference. Reference videos inform presentation only. Stickman Arena is not affiliated with any franchise shown in them.
