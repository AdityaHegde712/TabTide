export const STORE_KEY = "page-note-taker:v1";
export const STORE_VERSION = 1;


export function isSaveableText(text) {
  return typeof text === "string" && text.trim().length > 0;
}


export function groupEntries(entries, currentUrl) {
  const thisPage = [];
  const allPages = [];

  for (const entry of entries) {
    if (entry.url === currentUrl) {
      thisPage.push(entry);
    } else {
      allPages.push(entry);
    }
  }

  return { thisPage, allPages };
}


function sortNewestFirst(entries) {
  return [...entries].sort((left, right) => {
    const updatedDifference = Date.parse(right.updated_at) - Date.parse(left.updated_at);
    if (updatedDifference !== 0) {
      return updatedDifference;
    }

    return right.id.localeCompare(left.id);
  });
}


function isValidEntry(entry) {
  return entry
    && typeof entry.id === "string"
    && typeof entry.url === "string"
    && typeof entry.text === "string"
    && typeof entry.created_at === "string"
    && typeof entry.updated_at === "string";
}


function createEmptyStore() {
  return { version: STORE_VERSION, entries: [] };
}


export class PageNoteStore {
  constructor(storageArea, { createId = () => crypto.randomUUID(), now = () => new Date().toISOString() } = {}) {
    this.storageArea = storageArea;
    this.createId = createId;
    this.now = now;
    this.writeChain = Promise.resolve();
  }


  async list() {
    const data = await this.storageArea.get(STORE_KEY);
    const store = this.#parseStore(data[STORE_KEY]);
    return sortNewestFirst(store.entries);
  }


  async create({ url, text }) {
    if (!isSaveableText(text)) {
      throw new Error("A note must contain non-whitespace text.");
    }

    return this.#write(async (store) => {
      const id = this.createId();
      const duplicateId = store.entries.some((entry) => entry.id === id);
      if (duplicateId) {
        throw new Error("Could not create a unique note id.");
      }

      const timestamp = this.now();
      const entry = { id, url, text, created_at: timestamp, updated_at: timestamp };
      store.entries.push(entry);
      return entry;
    });
  }


  async update(id, { text }) {
    if (!isSaveableText(text)) {
      throw new Error("A note must contain non-whitespace text.");
    }

    return this.#write(async (store) => {
      const entry = store.entries.find((candidate) => candidate.id === id);
      if (!entry) {
        throw new Error("Entry not found.");
      }

      entry.text = text;
      entry.updated_at = this.now();
      return { ...entry };
    });
  }


  async delete(id) {
    return this.#write(async (store) => {
      const index = store.entries.findIndex((entry) => entry.id === id);
      if (index === -1) {
        throw new Error("Entry not found.");
      }

      store.entries.splice(index, 1);
    });
  }


  async #write(change) {
    const operation = this.writeChain.then(async () => {
      const data = await this.storageArea.get(STORE_KEY);
      const store = this.#parseStore(data[STORE_KEY]);
      const result = await change(store);
      await this.storageArea.set({ [STORE_KEY]: store });
      return result;
    });

    this.writeChain = operation.catch(() => undefined);
    return operation;
  }


  #parseStore(value) {
    if (value === undefined) {
      return createEmptyStore();
    }

    const hasExpectedShape = value
      && value.version === STORE_VERSION
      && Array.isArray(value.entries)
      && value.entries.every(isValidEntry);
    if (!hasExpectedShape) {
      throw new Error("Stored Page Note Taker data is invalid or from an unsupported version.");
    }

    return structuredClone(value);
  }
}
