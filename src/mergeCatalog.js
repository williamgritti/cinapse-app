import { collections, emptyCatalog } from "./storage.js";

export function sameValue(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length &&
    keys.every(key => Object.hasOwn(right, key) && sameValue(left[key], right[key]));
}

function byId(rows) {
  return new Map(rows.map(row => [row.id, row]));
}

// Each id is kept verbatim. Older watchlists refer to fractional numeric movie ids.
export function mergeCatalog(base, local, remote, preference) {
  if (sameValue(local, remote)) return { data: remote, conflict: false };
  if (base && sameValue(local, base)) return { data: remote, conflict: false };
  if (base && sameValue(remote, base)) return { data: local, conflict: false };
  const original = base ?? emptyCatalog();
  const data = {};
  const titles = new Set();
  for (const field of collections) {
    const prior = byId(original[field]);
    const ours = byId(local[field]);
    const theirs = byId(remote[field]);
    // Start with our newly added records; preserve the remote ordering for shared records.
    const ids = [...new Set([...ours.keys()].filter(id => !theirs.has(id)).concat([...theirs.keys()]))];
    const rows = [];
    for (const id of ids) {
      const before = prior.get(id), a = ours.get(id), b = theirs.get(id);
      let row;
      if (sameValue(a, b) || sameValue(b, before)) row = a;
      else if (sameValue(a, before)) row = b;
      else {
        const record = a ?? b;
        titles.add(record.title || record.name || String(id));
        row = preference === "remote" ? b : a;
      }
      if (row !== undefined) rows.push(row);
    }
    data[field] = rows;
  }
  // A concurrent removal and a new watchlist reference also disagree, across collections.
  // For valid pre-existing links, keep both the reference and its target or remove both.
  const movies = byId(data.catalog), localMovies = byId(local.catalog), remoteMovies = byId(remote.catalog);
  const originalMovies = byId(original.catalog);
  const missing = new Set(data.watchlists.flatMap(list => list.movieIds).filter(id => !movies.has(id) && originalMovies.has(id)));
  const removeLinks = new Set();
  for (const id of missing) {
    if (localMovies.has(id) === remoteMovies.has(id)) continue;
    titles.add(originalMovies.get(id).title || String(id));
    const chosen = (preference === "remote" ? remoteMovies : localMovies).get(id);
    if (chosen) data.catalog.push(chosen);
    else removeLinks.add(id);
  }
  if (removeLinks.size) {
    data.watchlists = data.watchlists.map(w => ({ ...w, movieIds: w.movieIds.filter(id => !removeLinks.has(id)) }));
  }
  return { data, conflict: titles.size > 0, titles: [...titles] };
}
