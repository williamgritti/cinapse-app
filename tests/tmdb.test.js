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

test("Audição acha o pôster de Ôdishon mesmo com título em português e ano a um de distância", async t => {
  const audition = {
    id: 11075,
    title: "O Teste Decisivo",
    original_title: "オーディション",
    release_date: "2000-03-03",
    poster_path: "/zwGaUMm0wAqi0wkO7LJDlwoA5LP.jpg",
  };
  const decoy = {
    id: 888,
    title: "Outra Coisa",
    original_title: "Odishon Fake",
    release_date: "2000-01-01",
    poster_path: "/errado.jpg",
  };
  const pink = {
    id: 999,
    title: "Honban ôdishon",
    original_title: "本番オーディション",
    release_date: "2009-01-30",
    poster_path: "/pink.jpg",
  };
  t.mock.method(globalThis, "fetch", async path => {
    const url = new URL(path, "https://cinapse.local");
    const id = url.searchParams.get("id");
    if (id === "11075") {
      return Response.json({
        id: 11075,
        poster_path: audition.poster_path,
        credits: { crew: [{ job: "Director", name: "Takashi Miike" }] },
      });
    }
    if (id === "888") {
      return Response.json({
        id: 888,
        poster_path: decoy.poster_path,
        credits: { crew: [{ job: "Director", name: "Outra Pessoa" }] },
      });
    }
    const query = url.searchParams.get("query");
    const year = url.searchParams.get("year");
    let results = [];
    if (query === "Audição" || query === "audicao") {
      results = [
        { id: 1, title: "Audição", original_title: "Audição", release_date: "2023-03-02", poster_path: "/2023.jpg" },
        { id: 2, title: "A Audição", original_title: "A Audição", release_date: "2002-01-01", poster_path: "/2002.jpg" },
      ];
    } else if (query === "Ôdishon" || query === "odishon") {
      results = [decoy, pink, audition];
    }
    if (year) results = results.filter(movie => (movie.release_date || "").startsWith(year));
    return Response.json({ results });
  });
  tmdb.setCloudEnabled(true);
  const poster = await tmdb.fetchPosterPath("Audição", "1999", {
    originalTitle: "Ôdishon",
    director: "Takashi Miike",
  });
  assert.deepEqual(poster, {
    poster_path: "/zwGaUMm0wAqi0wkO7LJDlwoA5LP.jpg",
    tmdb_id: 11075,
  });
});

test("busca em lote avisa quando o TMDb falha ou não acha o filme", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 502 }));
  tmdb.setCloudEnabled(true);
  const failed = await tmdb.fetchMissingPosters(
    [{ id: "audicao", title: "Audição", original_title: "Ôdishon", year: "1999", director: "Takashi Miike" }],
    () => { throw new Error("não deveria gravar"); },
  );
  assert.match(tmdb.posterFetchMessage(failed), /TMDb API: 502/);

  t.mock.method(globalThis, "fetch", async () => Response.json({ results: [] }));
  const missed = await tmdb.fetchMissingPosters(
    [{ id: "nada", title: "Nada Disso", year: "1991" }],
    () => { throw new Error("não deveria gravar"); },
  );
  assert.deepEqual(missed.missed, [{ title: "Nada Disso", year: "1991" }]);
  assert.match(tmdb.posterFetchMessage(missed), /Não encontrei pôster para Nada Disso \(1991\)/);
});
