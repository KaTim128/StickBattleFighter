---
name: reference-observation
description: Produce a Stickman Arena reference observation report from a reference game, video or screenshots - confirmed observations with timestamps, transferable principles, original 2D adaptations, things that must not be copied, conflicts and uncertainties. Use when a milestone benefits from reference research.
---
# Reference observation

Follow `.claude/rules/reference-usage.md` and spec §2.

## Steps
1. **Confirm access.** Open the actual material (decode the video, open the page, read the code read-only). If inaccessible, report that and stop; never infer content from a filename or description.
2. **Record the method and limitations:** sampling rate, resolution, whether audio was analysed (state plainly if it was not), and what may have been missed.
3. **Direct observations** with timestamps or file:line. Facts only.
4. **Interpretation:** the transferable principles, separated from the observations.
5. **Original Stickman Arena adaptations** for a 2D top-down, free-movement, five-action game, linked to spec IDs.
6. **Must-not-copy list:** names, characters, moves, UI, audio, art, code, exact sequences.
7. **Technical implications** and **conflicts or owner questions** (add new OQs to spec §21 via the Master).
8. Save as `docs/references/<SOURCE>_OBSERVATIONS.md`. The Master decides adoption and records it.

## Examples already produced
`docs/references/VIDEO_REFERENCE_OBSERVATIONS.md`, `docs/references/CREATURE_CLASH_OBSERVATIONS.md`.
