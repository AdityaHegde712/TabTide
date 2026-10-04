import { PageNoteStore, groupEntries, isSaveableText } from "./src/storage.js";

const DELETE_CONFIRMATION_PROMPT = "Delete entry?";

const elements = {
  allPagesEntries: document.querySelector("#all-pages-entries"),
  backToList: document.querySelector("#back-to-list"),
  cancelDelete: document.querySelector("#cancel-delete"),
  confirmDelete: document.querySelector("#confirm-delete"),
  currentUrl: document.querySelector("#current-url"),
  deleteConfirmation: document.querySelector("#delete-confirmation"),
  deleteEntry: document.querySelector("#delete-entry"),
  deleteTitle: document.querySelector("#delete-title"),
  editorTitle: document.querySelector("#editor-title"),
  editorView: document.querySelector("#editor-view"),
  entryCount: document.querySelector("#entry-count"),
  entryForm: document.querySelector("#entry-form"),
  entryText: document.querySelector("#entry-text"),
  entryUrl: document.querySelector("#entry-url"),
  listView: document.querySelector("#list-view"),
  newEntry: document.querySelector("#new-entry"),
  saveEntry: document.querySelector("#save-entry"),
  statusMessage: document.querySelector("#status-message"),
  thisPageEntries: document.querySelector("#this-page-entries"),
};

const store = new PageNoteStore(chrome.storage.local);
const state = {
  currentUrl: null,
  editingId: null,
  entries: [],
  pendingDeletionId: null,
  saving: false,
  view: "list",
};


function isSupportedUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const isWebProtocol = parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
    const isDirectPdf = parsedUrl.pathname.toLowerCase().endsWith(".pdf");
    return isWebProtocol && !isDirectPdf;
  } catch {
    return false;
  }
}


function describeStorageError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const isQuotaError = /quota|maximum|bytes/i.test(message);
  if (isQuotaError) {
    return "Local extension storage is full. Shorten or delete saved notes, then try again.";
  }

  return `Could not save local notes: ${message}`;
}


function setStatus(message = "", isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("error", isError);
}


function makeEmptyState(message) {
  const paragraph = document.createElement("p");
  paragraph.className = "empty-state";
  paragraph.textContent = message;
  return paragraph;
}


function makeEntryRow(entry, showUrl) {
  const row = document.createElement("article");
  row.className = "entry-row";

  const openButton = document.createElement("button");
  openButton.className = "entry-open";
  openButton.type = "button";
  openButton.addEventListener("click", () => openEditor(entry.id));

  const preview = document.createElement("span");
  preview.className = "entry-preview";
  preview.textContent = entry.text.replace(/\s+/g, " ");
  openButton.append(preview);

  if (showUrl) {
    const url = document.createElement("span");
    url.className = "entry-url-label";
    url.textContent = entry.url;
    openButton.append(url);
  }

  const deleteButton = document.createElement("button");
  deleteButton.className = "button danger entry-delete";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", "Delete this entry");
  deleteButton.addEventListener("click", () => requestDeletion(entry.id));

  row.append(openButton, deleteButton);
  return row;
}


function renderEntryList(container, entries, emptyMessage, showUrl) {
  const content = entries.length === 0
    ? [makeEmptyState(emptyMessage)]
    : entries.map((entry) => makeEntryRow(entry, showUrl));
  container.replaceChildren(...content);
}


function renderList() {
  const grouped = groupEntries(state.entries, state.currentUrl);
  const hasSupportedPage = state.currentUrl !== null;

  elements.entryCount.textContent = `${state.entries.length} saved ${state.entries.length === 1 ? "entry" : "entries"}`;
  elements.currentUrl.textContent = hasSupportedPage
    ? state.currentUrl
    : "Notes can only be created on normal HTTP or HTTPS web pages.";
  elements.newEntry.disabled = !hasSupportedPage;
  elements.newEntry.title = hasSupportedPage ? "" : "Open an HTTP or HTTPS page to create a note.";

  renderEntryList(
    elements.thisPageEntries,
    grouped.thisPage,
    hasSupportedPage ? "No entries saved for this exact URL." : "This page is unavailable for note creation.",
    false,
  );
  renderEntryList(elements.allPagesEntries, grouped.allPages, "No other saved entries.", true);
}


function resizeEditor() {
  elements.entryText.style.height = "auto";
  const desiredHeight = Math.min(elements.entryText.scrollHeight, 288);
  elements.entryText.style.height = `${Math.max(desiredHeight, 144)}px`;
}


function renderEditor() {
  const entry = state.entries.find((candidate) => candidate.id === state.editingId);
  const isEditing = entry !== undefined;

  elements.editorTitle.textContent = isEditing ? "Edit entry" : "New entry";
  elements.entryUrl.value = isEditing ? entry.url : state.currentUrl ?? "";
  elements.entryText.value = isEditing ? entry.text : "";
  elements.saveEntry.textContent = isEditing ? "Save changes" : "Save entry";
  elements.deleteEntry.hidden = !isEditing;
  resizeEditor();
}


function render({ resetEditor = false } = {}) {
  const showingList = state.view === "list";
  elements.listView.hidden = !showingList;
  elements.editorView.hidden = showingList;
  elements.deleteConfirmation.hidden = state.pendingDeletionId === null;
  elements.saveEntry.disabled = state.saving;
  elements.confirmDelete.disabled = state.saving;

  if (showingList) {
    renderList();
  } else if (resetEditor) {
    renderEditor();
  }
}


function openEditor(id = null) {
  state.editingId = id;
  state.view = "editor";
  setStatus();
  render({ resetEditor: true });
  elements.entryText.focus();
}


function returnToList() {
  state.editingId = null;
  state.view = "list";
  setStatus();
  render();
}


function requestDeletion(id) {
  state.pendingDeletionId = id;
  elements.deleteTitle.textContent = DELETE_CONFIRMATION_PROMPT;
  render();
  elements.cancelDelete.focus();
}


function dismissDeletion() {
  state.pendingDeletionId = null;
  render();
}


async function refreshEntries() {
  state.entries = await store.list();
}


async function saveEntry(event) {
  event.preventDefault();
  const text = elements.entryText.value;
  if (!isSaveableText(text)) {
    setStatus("Write a note before saving.", true);
    elements.entryText.focus();
    return;
  }

  state.saving = true;
  render();
  try {
    if (state.editingId) {
      await store.update(state.editingId, { text });
    } else if (state.currentUrl) {
      await store.create({ url: state.currentUrl, text });
    } else {
      throw new Error("This page does not provide a saveable HTTP or HTTPS URL.");
    }

    await refreshEntries();
    state.saving = false;
    returnToList();
  } catch (error) {
    state.saving = false;
    setStatus(describeStorageError(error), true);
    render();
  }
}


async function confirmDeletion() {
  const pendingDeletionId = state.pendingDeletionId;
  if (!pendingDeletionId) {
    return;
  }

  state.saving = true;
  render();
  try {
    await store.delete(pendingDeletionId);
    await refreshEntries();
    state.pendingDeletionId = null;
    state.saving = false;
    state.view = "list";
    state.editingId = null;
    setStatus("Entry deleted.");
    render();
  } catch (error) {
    state.saving = false;
    setStatus(describeStorageError(error), true);
    render();
  }
}


async function loadActiveUrl() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab && isSupportedUrl(tab.url) ? tab.url : null;
}


async function initialize() {
  try {
    state.currentUrl = await loadActiveUrl();
    await refreshEntries();
    if (!state.currentUrl) {
      setStatus("This tab is unavailable. You can still read notes saved for other pages.");
    }
  } catch (error) {
    setStatus(describeStorageError(error), true);
  }

  render();
}


elements.newEntry.addEventListener("click", () => openEditor());
elements.backToList.addEventListener("click", returnToList);
elements.cancelDelete.addEventListener("click", dismissDeletion);
elements.confirmDelete.addEventListener("click", confirmDeletion);
elements.deleteEntry.addEventListener("click", () => requestDeletion(state.editingId));
elements.entryForm.addEventListener("submit", saveEntry);
elements.entryText.addEventListener("input", resizeEditor);

initialize();
