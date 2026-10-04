# TabTide V1 Decisions

1. Manifest V3 with only `activeTab` and `storage`; no content script, host permission, service worker, network request, telemetry, or background worker.
2. Use a versioned JSON-compatible `chrome.storage.local` value for one local Brave profile. The popup handles persistence directly.
3. Group by the exact full active HTTP(S) URL, including query string and fragment. Non-HTTP(S) tabs are unavailable and cannot create notes.
4. The popup is dark minimal, opens to a reader-first list, and has a textarea that grows from 6 to 12 lines before internal scrolling. Unsaved drafts are discarded when the popup closes.
5. Search, sync, export, and import are intentionally excluded from V1. Delete requires an in-popup confirmation.
6. The product and GitHub repository name is TabTide. Its 128px generated raster icon is used for the extension action and management surface.
