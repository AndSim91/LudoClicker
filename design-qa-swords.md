# Design QA - Barra spade

- Source visual truth: `C:/Users/Legend/AppData/Local/Temp/codex-clipboard-b8329d8c-39e5-4609-88b8-5abc334d612c.png`
- Source dimensions: 2508 x 627 px; extracted sword crop: 2320 x 184 px
- Implementation URL: `http://127.0.0.1:4173/`
- Implementation screenshot: unavailable
- Intended viewport: desktop application; equipment card in "La mia giornata" and persistent topbar
- CSS size and density normalization: unavailable because browser capture is blocked
- State: worn equipment with the repair action visible; healthy equipment with no repair action

## Full-view comparison evidence

Blocked. The reference is available and was inspected, but the in-app browser runtime exited before it could open the local implementation. Windows reported `CryptUnprotectData failed: 2148073483`, so no same-state implementation screenshot could be captured.

## Focused region comparison evidence

- Source: horizontal lightsaber with a dark ribbed hilt, a rounded blade, and status fill extending from the start of the hilt.
- Implemented structure: the card segments are clipped by a single 2320 x 184 raster silhouette containing both hilt and blade; status distribution therefore begins inside the hilt.
- Topbar structure: a separate rounded horizontal cylinder is used without loading either saber mask.
- Rendered focused comparison: blocked because the browser capture is unavailable.

## Required fidelity surfaces

- Fonts and typography: existing project typography is preserved; rendered wrapping and optical weight could not be captured.
- Spacing and layout rhythm: the repair action shares the same compact legend row; exact rendered proportions could not be captured.
- Colors and visual tokens: existing semantic tokens for healthy, wear, reserved, and broken equipment are reused.
- Image quality and asset fidelity: the confirmed reference produced dedicated silhouette and outline masks at `public/assets/equipment/lightsaber-silhouette-mask.png` and `public/assets/equipment/lightsaber-outline-mask.png`; their final in-browser scaling could not be captured.
- Copy and content: "In uso", "Usura", "Rotte", and "Ripara" form the compact legend. The repair action is omitted when maintenance is not needed.

## Findings

- [P2] Visual comparison is blocked.
  Location: equipment quick card and topbar.
  Evidence: source visual is available, but no browser-rendered implementation screenshot exists.
  Impact: exact hilt width, blade height, mask sharpness, text wrapping, and four-column density cannot be signed off visually.
  Fix: capture both states in a working browser and compare them with the confirmed 2508 x 627 reference.

## Comparison history

1. The first interpretation used the same hilt variant in both the card and the topbar.
2. The implementation was revised so the hilt exists only in the card and the topbar uses a cylinder.
3. The transparent line-art overlay was rejected because a cylinder still ran behind it.
4. The replacement uses one complete saber silhouette: the hilt is taller than the blade, the blade begins after the emitter, and status segments are clipped through both regions.
5. Post-fix browser comparison remains unavailable because the in-app browser cannot start.

## Automated verification
- Mask extraction preview: visually matches the confirmed hilt-plus-blade geometry.
- Targeted tests: 58 passed.
- Targeted ESLint: passed.
- Production build: passed.
- `git diff --check`: passed.

final result: blocked

