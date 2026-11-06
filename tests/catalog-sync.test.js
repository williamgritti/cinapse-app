import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { CatalogSync } from "../src/useCatalogSync.js";
import { mergeCatalog } from "../src/mergeCatalog.js";
import { emptyCatalog, readCache, writeCache } from "../src/storage.js";

function storage() {
  const items = new Map();
  return {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key),
  };
}
const catalog = (...movies) => ({ ...emptyCatalog(), catalog: movies });
const movie = (id, notes = "") => ({ id, title: "Filme " + id, notes });
const owner = { authenticated: true, configured: true, tmdbConfigured: true };
const reply = (body, status = 200) => Response.json(body, { status });

beforeEach(() => {
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
});

function server(initial) {
  let snapshot = structuredClone(initial);
  let writes = 0;
  globalThis.fetch = async (url, options) => {
    if (url === "/api/session") return reply(owner);
    if (options.method === "GET") return reply(snapshot);
    const update = JSON.parse(options.body);
    if (snapshot.revision !== update.revision) return reply({}, 409);
    writes++;
    snapshot = { revision: snapshot.revision + 1, data: update.data };
    return reply({ revision: snapshot.revision });
  };
  return { snapshot: () => snapshot, writes: () => writes };
}

test("empty new device loads the owner's published movies without saving an empty catalog", async () => {
  const remote = { revision: 7, data: catalog(movie(12.5)) };
  const backend = server(remote);
  const client = new CatalogSync();
  client.active = true;
  await client.run();
  assert.deepEqual(client.state.data, remote.data);
  assert.deepEqual(readCache().base, remote);
  assert.equal(backend.writes(), 0);
});

test("legacy collections migrate once, retaining fractional IDs and watchlist links", async () => {
  const data = catalog(movie(123.5));
  data.watchlists = [{ id: 12, name: "Minha lista", movieIds: [123.5] }];
  localStorage.setItem("cinapse-data-v1", JSON.stringify(data));
  const backend = server({ revision: 0, data: null });
  const client = new CatalogSync();
  client.active = true;
  await client.run();
  await client.run();
  assert.equal(backend.writes(), 1);
  assert.deepEqual(backend.snapshot().data, data);
});

test("simultaneous edits on separate devices merge without replacing an unrelated new movie", async () => {
  const data = catalog(movie(1));
  const remote = { revision: 3, data: catalog(movie(1), movie(2)) };
  writeCache({ base: { revision: 2, data }, data: catalog(movie(1, "editado")) });
  const backend = server(remote);
  const client = new CatalogSync();
  client.active = true;
  await client.run();
  assert.deepEqual(backend.snapshot().data, catalog(movie(1, "editado"), movie(2)));
});

test("conflict preference retains independent records on both sides", () => {
  const base = catalog(movie(1));
  const local = catalog(movie(1, "neste"), movie(2));
  const remote = catalog(movie(1, "outro"), movie(3));
  assert.equal(mergeCatalog(base, local, remote).conflict, true);
  const result = mergeCatalog(base, local, remote, "remote").data.catalog;
  assert.deepEqual(result.sort((a, b) => a.id - b.id), [movie(1, "outro"), movie(2), movie(3)]);
});

test("absent, deleted and independently added records stay distinct", () => {
  const base = catalog(movie(1), movie(2));
  const local = catalog(movie(2), movie(3));
  const remote = catalog(movie(1), movie(2, "alterado"));
  const result = mergeCatalog(base, local, remote);
  assert.equal(result.conflict, false);
  assert.deepEqual(result.data.catalog, [movie(3), movie(2, "alterado")]);
});

test("an acknowledged revision can never vanish and silently empty a device", async () => {
  const data = catalog(movie(1));
  writeCache({ base: { revision: 5, data }, data });
  for (const remote of [{ revision: 0, data: null }, { revision: 5, data: catalog(movie(2)) }]) {
    const backend = server(remote);
    const client = new CatalogSync();
    client.active = true;
    await client.run();
    assert.equal(client.state.status, "error");
    assert.deepEqual(readCache().data, data);
    assert.equal(backend.writes(), 0);
  }
});

test("two tabs editing before storage events arrive preserve both new movies", () => {
  const a = new CatalogSync(), b = new CatalogSync();
  a.setCatalog(rows => [...rows, movie(1)]);
  b.setCatalog(rows => [...rows, movie(2)]);
  assert.deepEqual(readCache().data, catalog(movie(1), movie(2)));
});

test("an offline edit remains pending in the local snapshot after a reload", async () => {
  const data = catalog(movie(1));
  writeCache({ base: { revision: 2, data }, data });
  const first = new CatalogSync();
  first.setCatalog(rows => [...rows, movie(2)]);
  const backend = server({ revision: 2, data });
  const second = new CatalogSync();
  second.active = true;
  await second.run();
  assert.deepEqual(backend.snapshot().data, catalog(movie(1), movie(2)));
});

test("a conflicted older revision is checked again after choosing which change to retain", async () => {
  const data = catalog(movie(1));
  writeCache({ base: { revision: 1, data }, data: catalog(movie(1, "meu")) });
  server({ revision: 2, data: catalog(movie(1, "outro")) });
  const client = new CatalogSync();
  client.active = true;
  await client.run();
  assert.equal(client.state.status, "conflict");
  client.resolveConflict("local");
  clearTimeout(client.timer);
  const backend = server({ revision: 3, data: catalog(movie(1, "outra mudança")) });
  await client.run();
  assert.equal(client.state.status, "conflict");
  assert.equal(backend.writes(), 0);
});

test("conflict between deleting a movie and linking it to a watchlist preserves the chosen relationship", () => {
  const base = catalog(movie(123.5));
  const local = emptyCatalog();
  const remote = { ...base, watchlists: [{ id: 8, name: "Maratona", movieIds: [123.5] }] };
  const conflict = mergeCatalog(base, local, remote);
  assert.equal(conflict.conflict, true);
  assert.deepEqual(conflict.titles, ["Filme 123.5"]);
  assert.deepEqual(mergeCatalog(base, local, remote, "remote").data, remote);
  assert.deepEqual(mergeCatalog(base, local, remote, "local").data.watchlists[0].movieIds, []);
});

test("malformed legacy storage remains in place with a visible warning", () => {
  const raw = JSON.stringify(catalog(null));
  localStorage.setItem("cinapse-data-v1", raw);
  const client = new CatalogSync();
  assert.ok(client.storageWarning);
  assert.deepEqual(client.state.data, emptyCatalog());
  client.setCatalog([movie(2)]);
  assert.equal(localStorage.getItem("cinapse-data-v1"), raw);
});

test("restoring a backup writes all collections atomically", () => {
  const client = new CatalogSync();
  const saved = [];
  const original = localStorage.setItem;
  localStorage.setItem = (key, raw) => { saved.push(JSON.parse(raw)); original(key, raw); };
  const data = { ...catalog(movie(2)), watchlists: [{ id: 4, name: "Nova", movieIds: [2] }] };
  client.replaceData(data);
  assert.deepEqual(saved, [data]);
  assert.deepEqual(readCache().data, data);
});
