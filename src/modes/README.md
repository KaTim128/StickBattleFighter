# src/modes
**Owner:** AI Specialist (TD-009). Match flow and game modes: Practice Zone, 1v1, 3v3, Ladder Run, Story Mode. Orchestrates shared services; never re-implements combat.

## Tournament (REQ-MOD-8, TD-062)
- `tournament/tournament.ts`: pure bracket rules (create with byes for any size, record, simulate, advance, stage names, placement).
- `tournament/tournament-flow.ts`: stage-to-stage flow (player first, then watch up to 3 or skip, then settle and advance) and the result record.
- `tournament/tournament-store.ts`: saved tournament and history (browser storage, display only).
- Pages and screens: `src/app/tournament-page.ts`, `src/interface/tournament-screen.ts`; matches use `FightArenaScene`'s `match` option.

