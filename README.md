# TabTide

TabTide is a load-unpacked Brave extension for creating private, local notes tied to the exact full URL currently open in the active tab. It has no search, sync, export, telemetry, network calls, content script, or background worker.

## Install in Brave

1. Open `brave://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked** and choose this project directory: `C:\Users\hifia\Projects\PageNoteTaker`.
4. Pin **TabTide**, open a normal HTTP(S) page, and click its toolbar icon.

## Data and privacy boundary

The extension uses only the `activeTab` and `storage` permissions. It reads the active tab's URL after the toolbar action is opened and stores notes in Brave's extension-managed `chrome.storage.local` area under `page-note-taker:v1`.

This is local browser-profile storage, not a standalone JSON file. It is removed when the extension is removed and is subject to the browser's local-extension storage quota. The extension does not read page content or transmit any data.

Notes can be created only on HTTP(S) tabs. Brave and Chrome internal pages, extension-management pages, stores, PDFs, and local files show an unavailable state. Existing notes remain readable from the all-pages list.

## Automated checks

Run the frozen contract suite from the project root:

```powershell
npm install
npm test
```

The extension itself has no runtime package dependency. Playwright is used only for the optional local visual check:

```powershell
npx playwright install chromium
npm run test:ui
```

## Manual Brave verification

Automated tests cannot verify Brave's extension runtime. After loading the unpacked folder, manually verify create, read, update, deletion from both views, the unsupported-page state, bounded textarea scrolling, and persistence after closing and reopening the popup.
