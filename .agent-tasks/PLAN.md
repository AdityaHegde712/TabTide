# Page Note Taker V1 Plan

## Active phase

V1.1 is published to `origin/dev` at commit `5234a70`. Owner reload verification remains the final Brave runtime gate.

## Interaction flow

Toolbar action opens the saved-entry list. The popup reads the active HTTP(S) tab URL, shows matching entries in `This page`, all non-matching entries in `All pages`, and opens a create or detail editor. A successful explicit save persists one structured record in `chrome.storage.local`; deletion requires in-popup confirmation.

## Affected paths

- `manifest.json`, `popup.html`, `popup.css`, `popup.js`, `storage.js`, `README.md`
- `tests/spec/` frozen behavioral contracts
- `tests/integration/` browser-backed popup checks, if supported locally

## Exit criteria

- [x] Frozen contracts pass, JavaScript and JSON validate, and UTF-8/LF checks pass.
- [x] The popup rendered against mocked extension APIs and was visually inspected at 400px width.
- [ ] Owner loads the unpacked extension in Brave and completes the separate manual runtime checklist.

## vNext Proposed Additions

1. Convert only `*` within a saved URL entry into a safe glob wildcard. Escape every other regex metacharacter.
2. Match a current active URL against exact entries and wildcard entries. Keep matching entries in `This page`.
3. Allow URL editing only while creating a new entry. Existing entry URLs remain read-only.
4. Replace text delete controls with accessible copy and delete icon buttons. Copy emits the URL and note as plain text.
5. Preserve existing `chrome.storage.local` data. Do not add import/export because a reload retains storage. Removal remains the documented data-loss boundary.

## V1.1 exit criteria

- [x] Frozen tests prove wildcard matching, literal regex escaping, editable new-entry URLs, and icon action contracts.
- [x] Mocked-extension UI verification proves copy, delete confirmation, and wildcard grouping.
- [x] A conventional commit is pushed directly to `origin/dev` after validation.
