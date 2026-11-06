import { isCatalogData } from "../shared/catalog.js";

const KEY = "cinapse-data-v1";
const TAB_DRAFT = "cinapse-pending-tab-v1";
export const collections = ["catalog", "watchlists", "checklists"];

export function emptyCatalog() {
  return { catalog: [], watchlists: [], checklists: [] };
}

export function decodeCache(raw) {
  if (raw === null) return { data: emptyCatalog(), base: null };
  const saved = JSON.parse(raw);
  const { catalog, watchlists, checklists, cloud } = saved ?? {};
  const data = { catalog, watchlists, checklists };
  if (!isCatalogData(data)) throw new Error("O catálogo deste navegador é inválido.");
  let base = null;
  if (cloud) {
    if (!Number.isSafeInteger(cloud.revision) || cloud.revision < 1 ||
        ("data" in cloud && !isCatalogData(cloud.data))) {
      throw new Error("A versão salva neste navegador é inválida.");
    }
    base = { revision: cloud.revision, data: cloud.data ?? data };
  }
  return { data, base };
}

export function readCache() {
  return decodeCache(localStorage.getItem(KEY));
}

export function readTabDraft() {
  const raw = sessionStorage.getItem(TAB_DRAFT);
  return raw && decodeCache(raw);
}

function encodeCache({ data, base }) {
  // One write keeps the local edits and the version they were made against together.
  // Clean snapshots need only one copy of the potentially large catalog.
  const cloud = base && (data === base.data
    ? { revision: base.revision }
    : { revision: base.revision, data: base.data });
  return JSON.stringify(cloud ? { ...data, cloud } : data);
}

export function writeCache(cache) {
  localStorage.setItem(KEY, encodeCache(cache));
}

export function saveTabDraft(cache) {
  if (cache) sessionStorage.setItem(TAB_DRAFT, encodeCache(cache));
  else sessionStorage.removeItem(TAB_DRAFT);
}

export function isCacheEvent(event) {
  return event.key === KEY || event.key === null;
}
