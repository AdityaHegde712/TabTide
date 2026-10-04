import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..", "..");

async function readProjectFile(relativePath) {
  return readFile(resolve(root, relativePath), "utf8");
}

test("manifest declares only activeTab and storage permissions and opens the popup", async () => {
  const manifest = JSON.parse(await readProjectFile("manifest.json"));

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["activeTab", "storage"]);
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.equal("background" in manifest, false);
  assert.equal("content_scripts" in manifest, false);
});

test("popup is CSP-safe: it loads external scripts and source code never uses innerHTML", async () => {
  const popupHtml = await readProjectFile("popup.html");
  const popupScript = await readProjectFile("popup.js");

  assert.match(popupHtml, /<script\s+[^>]*src=["']popup\.js["'][^>]*><\/script>/i);
  assert.doesNotMatch(popupHtml, /<script(?![^>]*\bsrc=)[^>]*>\s*\S/i);
  assert.doesNotMatch(popupScript, /\binnerHTML\b/);
});

test("popup markup exposes list, exact-page section, all-pages section, and a detail editor", async () => {
  const popupHtml = await readProjectFile("popup.html");

  for (const id of ["entry-count", "this-page-entries", "all-pages-entries", "new-entry", "entry-url", "entry-text"]) {
    assert.match(popupHtml, new RegExp(`id=["']${id}["']`));
  }
  assert.match(popupHtml, /id=["']entry-url["'][^>]*\breadonly\b/i);
  assert.match(popupHtml, /id=["']entry-text["'][^>]*\bmaxlength\b/i);
});

test("deletion has an explicit confirmation state before the store delete call", async () => {
  const popupScript = await readProjectFile("popup.js");

  assert.match(popupScript, /pendingDeletionId/);
  assert.match(popupScript, /confirm-delete/);
  assert.match(popupScript, /cancel-delete/);
  assert.match(popupScript, /store\.delete\(pendingDeletionId\)/);
  assert.match(popupScript, /Delete entry\?/);
});
