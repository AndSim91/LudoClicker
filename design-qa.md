# Design QA — Box SIS collaboratore

- Source visual truth: `C:/Users/Legend/AppData/Local/Temp/codex-clipboard-210bbb30-eb84-454c-9cd8-88f0bd0848d1.png`
- Source dimensions: 336 × 179 px
- Implementation screenshot: unavailable
- Intended viewport: desktop, collapsed SIS card inside the collaborator identity column
- Density normalization: not applicable; implementation capture unavailable
- State: SIS unlocked, Technician course card collapsed

## Full-view comparison evidence

Blocked. The source screenshot is available in the conversation, but the in-app browser could not start because the Windows sandbox returned `CryptUnprotectData failed: 2148073483`. No same-state implementation screenshot could be captured.

## Focused region comparison evidence

Blocked for the same reason. The target region is the Form logo strip followed by the collapsed SIS card.

## Findings and fixes

- [P2] The `SIS` badge text inherited the collaborator text color and had insufficient contrast. Fixed with an explicit white foreground on `.collaborator-copy .technician-course-badge`.
- [P2] The collapsed SIS card shrank to the content width. Fixed by allowing `.collaborator-copy` to fill the remaining identity-column space and setting `.technician-course-control` to `width: 100%`.
- [P2] The course card was previously placed in the assignment controls. Fixed by rendering it immediately after the collaborator's Form logo strip.

## Comparison history

1. Source evidence showed dark `SIS` text and a narrow collapsed card.
2. CSS and component placement fixes were applied.
3. Post-fix visual comparison could not run because browser capture is unavailable.

## Automated verification

- People view tests: 39 passed.
- Targeted ESLint: passed.
- `git diff --check`: passed.

final result: blocked
