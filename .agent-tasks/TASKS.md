# Page Note Taker V1 Task Ledger

1. [x] Establish project state and freeze Node behavioral contracts.
   - Acceptance: `tests/spec/` covers manifest, storage behavior, grouping, validation, CSP-safe rendering, and deletion confirmation; it fails before source exists.
2. [x] Implement the MV3 manifest, popup UI, storage module, and README without changing frozen tests.
   - Acceptance: all test contracts pass and UI satisfies the locked V1 decisions.
3. [/] Validate formatting, syntax, contracts, and rendered popup behavior.
   - Evidence: 10 frozen contracts, JSON parsing, JavaScript syntax, UTF-8/LF checks, and mocked-extension Chromium visual checks pass.
   - Remaining acceptance: manual Brave verification remains owner-pending.

Immediate next action: load this project folder from `brave://extensions` and complete the README manual verification checklist.

## V1.1 Wildcards and row actions

4. [x] Freeze wildcard, URL-editing, clipboard, and icon-button contracts.
   - Evidence: focused red contract failed before `matchesUrlPattern` existed.
5. [x] Implement V1.1 storage matching and popup controls.
   - Evidence: only `*` becomes wildcard; storage validates URL input; copy and delete icon controls remain accessible.
6. [/] Validate, commit, and publish V1.1 to `dev`.
   - Evidence: 17 frozen contracts, syntax, manifest parsing, and mocked Playwright UI checks pass.
   - Blocker: sandbox Git credentials cannot access `origin`; commit and push require a credential-capable Git environment.

Immediate next action: commit the verified V1.1 change and push it to `origin/dev` from a credential-capable Git environment.
