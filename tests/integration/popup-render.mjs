import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..", "..");
const previewDirectory = resolve(root, ".agent-tasks");
const previewPath = resolve(previewDirectory, "popup-preview.png");
const currentUrl = "https://example.test/article?view=full#comments";
const servedFiles = new Map([
  ["/popup.html", { path: resolve(root, "popup.html"), type: "text/html" }],
  ["/popup.css", { path: resolve(root, "popup.css"), type: "text/css" }],
  ["/popup.js", { path: resolve(root, "popup.js"), type: "text/javascript" }],
  ["/src/storage.js", { path: resolve(root, "src", "storage.js"), type: "text/javascript" }],
]);

const storedNotes = {
  "page-note-taker:v1": {
    version: 1,
    entries: [
      {
        id: "this-page-entry",
        url: currentUrl,
        text: "A note for this exact page.",
        created_at: "2026-10-03T12:00:00.000Z",
        updated_at: "2026-10-03T12:00:00.000Z",
      },
      {
        id: "other-page-entry",
        url: "https://example.test/other",
        text: "A note for another page.",
        created_at: "2026-10-03T13:00:00.000Z",
        updated_at: "2026-10-03T13:00:00.000Z",
      },
    ],
  },
};

const server = createServer(async (request, response) => {
  const file = servedFiles.get(request.url === "/" ? "/popup.html" : request.url);
  if (!file) {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, { "content-type": file.type });
  response.end(await readFile(file.path));
});

await new Promise((resolveServer) => server.listen(0, "127.0.0.1", resolveServer));
const serverAddress = server.address();
assert(serverAddress && typeof serverAddress !== "string");
const popupUrl = `http://127.0.0.1:${serverAddress.port}/popup.html`;
const browser = await chromium.launch({ headless: true, timeout: 5000 });

try {
  const page = await browser.newPage({ viewport: { width: 400, height: 590 } });

  await page.addInitScript(({ activeUrl, notes }) => {
    const values = structuredClone(notes);
    globalThis.chrome = {
      tabs: {
        query: async () => [{ url: activeUrl }],
      },
      storage: {
        local: {
          get: async (key) => ({ [key]: structuredClone(values[key]) }),
          set: async (updates) => Object.assign(values, structuredClone(updates)),
        },
      },
    };
  }, { activeUrl: currentUrl, notes: storedNotes });

  await page.goto(popupUrl, { waitUntil: "commit", timeout: 5000 });
  await page.getByText("A note for this exact page.").waitFor({ timeout: 5000 });

  assert.equal(await page.locator("#this-page-entries .entry-row").count(), 1);
  assert.equal(await page.locator("#all-pages-entries .entry-row").count(), 1);
  assert.equal(await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth), true);

  await page.locator("#all-pages-entries").getByRole("button", { name: "Delete this entry" }).click();
  assert.equal(await page.locator("#delete-confirmation").isVisible(), true);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.locator("#all-pages-entries .entry-row").waitFor({ state: "detached", timeout: 5000 });

  await page.locator("#this-page-entries .entry-open").click();
  await page.locator("#entry-text").fill("Updated current-page note.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("Updated current-page note.").waitFor({ timeout: 5000 });

  await page.locator("#this-page-entries .entry-open").click();
  await page.getByRole("button", { name: "Delete entry" }).click();
  assert.equal(await page.locator("#delete-confirmation").isVisible(), true);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.locator("#this-page-entries .entry-row").waitFor({ state: "detached", timeout: 5000 });

  await page.getByRole("button", { name: "New entry" }).click();
  await page.locator("#entry-text").fill("Line ".repeat(500));
  const editorMetrics = await page.locator("#entry-text").evaluate((editor) => ({
    clientHeight: editor.clientHeight,
    scrollHeight: editor.scrollHeight,
    scrollable: editor.scrollHeight > editor.clientHeight,
  }));
  assert.equal(editorMetrics.scrollable, true);

  await mkdir(previewDirectory, { recursive: true });
  await page.screenshot({ path: previewPath, fullPage: true });
  await page.getByRole("button", { name: "Save entry" }).click();
  assert.equal(await page.locator("#this-page-entries .entry-row").count(), 1);
  console.log(`Rendered popup verified and screenshot saved to ${previewPath}`);
} finally {
  await browser.close();
  await new Promise((resolveServer, rejectServer) => server.close((error) => error ? rejectServer(error) : resolveServer()));
}
