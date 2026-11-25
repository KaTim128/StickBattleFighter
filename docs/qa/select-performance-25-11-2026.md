# Fighter select performance (S1), 25/11/2026

Measured in headless Chromium with software WebGL (slow, so absolute numbers are exaggerated; the ratios are what matter), 1280×720,
13 fighters, `performance.mark` around the strip drawing (`__stickmanDebug.timings`) and a long-task observer. Script: Practice → Open Zone.

| | Before | After, first visit (cold) | After, later visit (cached) |
|---|---|---|---|
| Idle strips all ready | 13.2 s | 21 s (in the background, drawn one at a time) | 1.25 s |
| First strip on screen | 15.2 s (after one blocking task) | 2.7–3.0 s | 1.1–1.25 s |
| Longest single blocking task | 13.2 s | 1.1–1.5 s | 0.8 s (portraits) |
| Strips served from the cache | 0 | 0 | 13 of 13 |

What changed:
- `renderIdleStrips` reports each strip as it is drawn and yields to the page between fighters; the fighter on show is drawn first.
- Strips are kept in IndexedDB (`src/rendering/strip-cache.ts`) under fighter id + hash of its definition and stance + renderer version, so an edited
  fighter or a new renderer version is a miss and everything else survives page reloads.
- The tile click still rebuilds the select screen (cheap next to the strips); not changed.

Limits: software rendering; a real phone was not measured. Cold total time rose because the page now gets turns between fighters.
