---
paths:
  - "assets/**"
  - "public/**"
  - "src/data/**"
---
# Asset management rules

- **Original assets only.** Never add assets copied or traced from Froggy, Pokémon, Stickman Kombat 2D or any other third party. Third-party assets need a compatible licence recorded in `assets/ASSET_REGISTER.md` before they are committed.
- Every asset gets a register entry: path, type, owner, source/author, licence, status (`greybox` / `wip` / `final`), and the spec ID it serves.
- Greybox and placeholder assets live under a `greybox/` subfolder and are clearly labelled. They never ship as final.
- Formats: models and animations as glTF 2.0 binary (`.glb`); textures power-of-two, compressed (KTX2) where supported; audio as `.ogg` with an `.mp3` or `.m4a` fallback if needed (final choices per TD-007).
- Naming: `kebab-case`, prefixed by category (e.g. `fighter-titan.glb`, `prop-office-chair.glb`, `anim-ronin-ability-2.glb`).
- Fighters follow the shared rig contract (Animation and Character). Asset validation tests must fail on missing required clips, bones or materials.
- Keep source files (e.g. `.blend`) out of the runtime bundle (store them under `assets/source/` or outside the repo if large; decide in Phase 1).
- Large binaries: agree a size policy (and Git LFS if needed) with the Master before committing files over 10 MB.
