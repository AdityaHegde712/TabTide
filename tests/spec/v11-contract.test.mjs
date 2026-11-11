import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { PageNoteStore, groupEntries, matchesUrlPattern } from "../../src/storage.js";

const root = resolve(import.meta.dirname, "..", "..");

async function readProjectFile(relativePath) {
  return readFile(resolve(root, relativePath), "utf8");
}

function createStorageArea() {
  const data = new Map();

  return {
    async get(key) {
      return { [key]: data.get(key) };
    },
    async set(values) {
      for (const [key, value] of Object.entries(values)) {
        data.set(key, value);
      }
    },
  };
}

test("URL patterns support only an asterisk wildcard and treat regex punctuation literally", () => {
  assert.equal(matchesUrlPattern("https://www.google.com/search?q=notes", "*google.com/*"), true);
  assert.equal(matchesUrlPattern("https://www.googleXcom/search?q=notes", "*google.com/*"), false);
  assert.equal(matchesUrlPattern("https://example.test/v1.2/[stable]", "https://example.test/v1.2/[stable]"), true);
  assert.equal(matchesUrlPattern("https://example.test/v1x2/xstablex", "https://example.test/v1.2/[stable]"), false);
  assert.equal(matchesUrlPattern("https://example.test/rate+a?draft=$5", "https://example.test/rate+a?draft=$5"), true);
  assert.equal(matchesUrlPattern("https://example.test/rateaaaxdraftx=5", "https://example.test/rate+a?draft=$5"), false);
});

test("URL grouping includes matching patterns in this page and excludes them from all pages", () => {
  const currentUrl = "https://www.google.com/search?q=notes";
  const entries = [
    { id: "one", url: "*google.com/*", text: "Google pattern note" },
    { id: "two", url: "https://other.example", text: "Other page note" },
    { id: "three", url: "*googleXcom/*", text: "Literal dot pattern note" },
  ];

  assert.deepEqual(groupEntries(entries, currentUrl), {
    thisPage: [entries[0]],
    allPages: [entries[1], entries[2]],
  });
});

test("storage rejects blank and overlong URLs without changing the versioned entry schema", async () => {
  const area = createStorageArea();
  const store = new PageNoteStore(area, {
    createId: () => "entry-one",
    now: () => "2026-11-11T12:00:00.000Z",
  });

  await assert.rejects(
    store.create({ url: "  ", text: "A valid note" }),
    /url/i,
  );
  await assert.rejects(
    store.create({ url: `https://example.test/${"a".repeat(2049)}`, text: "A valid note" }),
    /url|length/i,
  );

  const entry = await store.create({ url: "https://example.test/valid", text: "A valid note" });
  assert.deepEqual(Object.keys(entry).sort(), ["created_at", "id", "text", "updated_at", "url"]);
});

test("URL pattern matching rejects overlong values", () => {
  assert.equal(matchesUrlPattern("https://example.test", "*".repeat(2049)), false);
});

test("new entries unlock their URL while existing entry URLs stay immutable", async () => {
  const popupScript = await readProjectFile("popup.js");

  assert.match(popupScript, /elements\.entryUrl\.readOnly\s*=\s*isEditing/);
  assert.match(popupScript, /store\.create\(\{\s*url:\s*elements\.entryUrl\.value\s*,\s*text\s*}\)/s);
  assert.match(popupScript, /store\.update\(state\.editingId,\s*\{\s*text\s*}\)/s);
});

test("copy and delete are icon actions with accessible names and explicit user action handlers", async () => {
  const popupHtml = await readProjectFile("popup.html");
  const popupScript = await readProjectFile("popup.js");

  assert.match(popupScript, /aria-label["']?,\s*["']Copy entry["']/);
  assert.match(popupScript, /aria-label["']?,\s*["']Delete entry["']/);
  assert.match(popupScript, /className\s*=\s*["'][^"']*icon-action/);
  assert.match(popupScript, /copyButton\.addEventListener\(["']click["']/);
  assert.match(popupScript, /deleteButton\.addEventListener\(["']click["']/);
  assert.match(popupScript, /navigator\.clipboard\.writeText\(formatEntryForClipboard\(entry\)\)/);
  assert.match(popupScript, /copyButton\.addEventListener\(["']click["'][\s\S]*?navigator\.clipboard\.writeText/);
  assert.match(popupScript, /navigator\.clipboard\.writeText[\s\S]*?catch[\s\S]*?setStatus\(/);
});

test("copy text contains the entry URL, two line breaks, and its note", async () => {
  const { formatEntryForClipboard } = await import("../../src/clipboard.js");
  const entry = {
    url: "https://example.test/path?mode=full#part",
    text: "Keep this note exactly.",
  };

  assert.equal(
    formatEntryForClipboard(entry),
    "https://example.test/path?mode=full#part\n\nKeep this note exactly.",
  );
});
