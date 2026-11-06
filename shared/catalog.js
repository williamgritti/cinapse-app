const text = (value) => typeof value === "string";
const id = (value) => Number.isFinite(value) || (text(value) && value.trim().length > 0);
const number = Number.isFinite;
const textList = (value) => Array.isArray(value) && value.every(text);

// Reject unexpected fields, including credentials from legacy export files.
// A movie's optional metadata sometimes contains null (e.g. TMDb poster_path).
function fields(record, schema) {
  return record && typeof record === "object" && !Array.isArray(record)
    && Object.entries(record).every(([key, value]) =>
      Object.hasOwn(schema, key) && (value == null || schema[key](value)));
}

function records(rows, validate) {
  if (!Array.isArray(rows)) return false;
  const ids = new Set();
  for (const row of rows) {
    if (!row || !id(row.id) || ids.has(row.id) || !validate(row)) return false;
    ids.add(row.id);
  }
  return true;
}

const serviceFields = { name: text, type: text };
const movieFields = {
  id, title: text, original_title: text, director: text, overview: text,
  year: (value) => text(value) || number(value), notes: text, status: text,
  genres: textList, cast: textList, tags: textList,
  rating: number, myRating: number, runtime: number, addedAt: number,
  poster_path: text, backdrop_path: text, _source: text, tmdb_id: id, _rawTmdbId: id,
  streaming: (value) => Array.isArray(value) && value.every((s) =>
    fields(s, serviceFields) && text(s.name) && text(s.type)),
};
const watchlistFields = { id, name: text, desc: text, movieIds: Array.isArray, createdAt: number };
const checklistFields = { id, name: text, items: Array.isArray, createdAt: number };
const itemFields = { id, text, done: (value) => typeof value === "boolean" };

export function isCatalogData(data) {
  if (!fields(data, { catalog: Array.isArray, watchlists: Array.isArray, checklists: Array.isArray })) return false;
  // Curated watchlists in v1 generated fractional numeric movie IDs.
  return records(data.catalog, (m) => fields(m, movieFields) && text(m.title))
    && records(data.watchlists, (w) => fields(w, watchlistFields) && text(w.name)
      && Array.isArray(w.movieIds) && w.movieIds.every(id))
    && records(data.checklists, (c) => fields(c, checklistFields) && text(c.name)
      && records(c.items, (item) => fields(item, itemFields) && text(item.text) && typeof item.done === "boolean"));
}
