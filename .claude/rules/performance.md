---
paths:
  - "src/**"
  - "assets/**"
---
# Performance rules

- Mobile is a first-class target. Budgets (FPS, memory, load time, bundle size) are set by the owner (OQ-10). Until then, measure and report; do not regress the measured baseline.
- No per-frame allocations in hot paths (simulation step, render loop, particle updates). Pool projectiles, particles, decals and floating text.
- Cosmetic objects use no expensive physics. Cap debris counts and lifetimes and clean them up (REQ-PHY-7).
- Prefer instancing and merged geometry for repeated props; use LOD and texture compression for mobile.
- Physics bodies sleep when idle; use collision groups to avoid unnecessary pair tests.
- Load assets per scene. Never block the main thread on large synchronous work; show loading states.
- Profile before optimising, and record frame-time and memory evidence in the progress record for performance-related changes.
