import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const localKey = "synthetic-key-for-unit-tests";
let tmdb;
let originalStorage;

before(async () => {
  originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: key => key === "cinapse-tmdb-key" ? localKey : null },
  });
  tmdb = await import("../src/tmdb.js");
});

after(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
});

test("proxy autenticado busca, atualiza pôster e preserva o ID do TMDb sem enviar a chave local", async t => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async path => {
    requests.push(path);
    const record = { id: 123, title: "A & B", poster_path: "/poster.jpg" };
    return Response.json(path.includes("query=") ? { results: [record] } : record);
  });
  tmdb.setCloudEnabled(true);
  const [movie] = await tmdb.searchMovies("A & B");
  const poster = await tmdb.fetchPosterPath("A & B", "2024");
  const saved = await tmdb.enrichMovie(movie);
  assert.equal(saved.tmdb_id, 123);
  assert.deepEqual(poster, { poster_path: "/poster.jpg", tmdb_id: 123 });
  assert.deepEqual(requests, [
    "/api/tmdb?query=A+%26+B",
    "/api/tmdb?query=A+%26+B&year=2024",
    "/api/tmdb?id=123",
  ]);
});

test("modo local continua usando a chave do navegador para busca e detalhes", async t => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async path => {
    requests.push(new URL(path));
    return Response.json({ results: [] });
  });
  tmdb.setCloudEnabled(false);
  assert.equal(tmdb.hasApiKey(), true);
  await tmdb.searchMovies("A & B", "2024");
  await tmdb.getMovieDetails(123);
  assert.deepEqual(requests.map(url => url.pathname), ["/3/search/movie", "/3/movie/123"]);
  for (const url of requests) {
    assert.equal(url.origin, "https://api.themoviedb.org");
    assert.equal(url.searchParams.get("api_key"), localKey);
    assert.equal(url.searchParams.get("language"), "pt-BR");
  }
  assert.equal(requests[0].searchParams.get("query"), "A & B");
  assert.equal(requests[0].searchParams.get("year"), "2024");
  assert.equal(requests[1].searchParams.get("append_to_response"), "credits,watch/providers");
});

test("sessão expirada não tenta a chave local como fallback", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  tmdb.setCloudEnabled(true);
  await assert.rejects(tmdb.searchMovies("A & B"), /Entre novamente/);
  assert.equal(fetch.mock.callCount(), 1);
});
