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
6. [x] Validate, commit, and publish V1.1 to `dev`.
   - Evidence: 17 frozen contracts, syntax, manifest parsing, mocked Playwright UI checks, and `git push origin HEAD:dev` passed.
   - Published commit: `5234a70 feat: add URL patterns and entry actions`.

Immediate next action: reload TabTide in Brave and verify wildcard matching and clipboard copy in the live extension.
