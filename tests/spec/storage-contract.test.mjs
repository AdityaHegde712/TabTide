import assert from "node:assert/strict";
import test from "node:test";

import {
  PageNoteStore,
  STORE_KEY,
  STORE_VERSION,
  groupEntries,
  isSaveableText,
} from "../../src/storage.js";

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
    snapshot() {
      return structuredClone(data.get(STORE_KEY));
    },
  };
}

test("the local store is versioned JSON with the documented storage key", () => {
  assert.equal(STORE_KEY, "page-note-taker:v1");
  assert.equal(STORE_VERSION, 1);
});

test("creating entries persists every required field and lists newest updates first", async () => {
  const area = createStorageArea();
  const store = new PageNoteStore(area, {
    createId: () => "entry-one",
    now: () => "2026-10-03T12:00:00.000Z",
  });

  const first = await store.create({
    url: "https://example.test/a?topic=one#part",
    text: "First saved note",
  });

  assert.deepEqual(first, {
    id: "entry-one",
    url: "https://example.test/a?topic=one#part",
    text: "First saved note",
    created_at: "2026-10-03T12:00:00.000Z",
    updated_at: "2026-10-03T12:00:00.000Z",
  });
  assert.deepEqual(area.snapshot(), {
    version: 1,
    entries: [first],
  });

  const laterStore = new PageNoteStore(area, {
    createId: () => "entry-two",
    now: () => "2026-10-03T13:00:00.000Z",
  });
  const second = await laterStore.create({
    url: "https://example.test/other",
    text: "Second saved note",
  });

  assert.deepEqual(await laterStore.list(), [second, first]);
});

test("updating preserves identity and creation time while changing updated time", async () => {
  const area = createStorageArea();
  const store = new PageNoteStore(area, {
    createId: () => "entry-one",
    now: () => "2026-10-03T12:00:00.000Z",
  });
  const created = await store.create({ url: "https://example.test/a", text: "Before" });
  const updateStore = new PageNoteStore(area, {
    now: () => "2026-10-03T14:00:00.000Z",
  });

  const updated = await updateStore.update(created.id, { text: "After" });

  assert.deepEqual(updated, {
    ...created,
    text: "After",
    updated_at: "2026-10-03T14:00:00.000Z",
  });
  assert.deepEqual(await updateStore.list(), [updated]);
});

test("deleting removes only the selected entry and reports a missing id", async () => {
  const area = createStorageArea();
  let id = 0;
  const store = new PageNoteStore(area, {
    createId: () => `entry-${++id}`,
    now: () => "2026-10-03T12:00:00.000Z",
  });
  const first = await store.create({ url: "https://example.test/a", text: "Keep me" });
  const second = await store.create({ url: "https://example.test/b", text: "Delete me" });

  await store.delete(second.id);

  assert.deepEqual(await store.list(), [first]);
  await assert.rejects(store.delete("does-not-exist"), /not found/i);
});

test("blank and whitespace-only note text cannot be saved", () => {
  assert.equal(isSaveableText("A note"), true);
  assert.equal(isSaveableText("  A note  "), true);
  assert.equal(isSaveableText(""), false);
  assert.equal(isSaveableText(" \n\t "), false);
});

test("this-page grouping uses the exact complete URL and excludes it from all pages", () => {
  const currentUrl = "https://example.test/article?view=full#comments";
  const currentEntry = {
    id: "current",
    url: currentUrl,
    text: "Current page",
    created_at: "2026-10-03T12:00:00.000Z",
    updated_at: "2026-10-03T12:00:00.000Z",
  };
  const samePathDifferentFragment = {
    id: "different-fragment",
    url: "https://example.test/article?view=full#top",
    text: "Different full URL",
    created_at: "2026-10-03T13:00:00.000Z",
    updated_at: "2026-10-03T13:00:00.000Z",
  };
  const result = groupEntries([currentEntry, samePathDifferentFragment], currentUrl);

  assert.deepEqual(result.thisPage, [currentEntry]);
  assert.deepEqual(result.allPages, [samePathDifferentFragment]);
});
