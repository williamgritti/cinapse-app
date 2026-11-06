import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../api/catalog.js";
import session from "../api/session.js";
import tmdb from "../api/tmdb.js";
import { isCatalogData } from "../shared/catalog.js";

const host = "cinapse.example";
const password = "fixture-only-password";
const restUrl = "https://redis.example";
Object.assign(process.env, { CINAPSE_PASSWORD: password, UPSTASH_REDIS_REST_URL: restUrl,
  UPSTASH_REDIS_REST_TOKEN: "fixture-redis", TMDB_API_KEY: "fixture-tmdb" });

async function request(handler, method, { body, cookie, url = "/", origin = "https://" + host } = {}) {
  const req = { method, url, body, headers: { host, origin, cookie,
    "x-forwarded-proto": "https", "content-type": "application/json" } };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(n) { this.code = n; return this; }, json(value) { this.body = value; } };
  await handler(req, res);
  return res;
}

function provider(result) {
  return Response.json({ result });
}

async function login(t) {
  const mock = t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, restUrl);
    const cmd = JSON.parse(init.body);
    assert.equal(cmd[0], "EVAL");
    assert.equal(cmd.at(-1), "1");
    return provider(1);
  });
  const res = await request(session, "POST", { body: { password } });
  mock.mock.restore();
  assert.equal(res.code, 200);
  assert.equal(res.body.authenticated, true);
  assert.match(res.headers["Set-Cookie"], /HttpOnly; SameSite=Strict; Max-Age=\d+; Secure/);
  return res.headers["Set-Cookie"].split(";")[0];
}

const data = { catalog: [{ id: 123.125, title: "Filme" }],
  watchlists: [{ id: 1, name: "Ver", movieIds: [123.125] }], checklists: [] };

test("validates legacy fractional IDs and rejects malformed or secret-bearing snapshots", () => {
  assert.equal(isCatalogData(data), true);
  for (const invalid of [
    { ...data, tmdbApiKey: "secret" },
    { ...data, catalog: [data.catalog[0], data.catalog[0]] },
    { ...data, catalog: [{ ...data.catalog[0], cast: "invalid" }] },
    { ...data, catalog: [{ ...data.catalog[0], password: "secret" }] },
    { ...data, checklists: [{ id: "a", name: "Lista", items: [{ id: "b", text: {} }] }] },
  ]) assert.equal(isCatalogData(invalid), false);
});

test("catalog requires a signed session and same-origin writes", async (t) => {
  assert.equal((await request(catalog, "GET")).code, 401);
  const cookie = await login(t);
  const forged = cookie.slice(0, -1) + (cookie.endsWith("A") ? "B" : "A");
  assert.equal((await request(catalog, "GET", { cookie: forged })).code, 401);
  assert.equal((await request(catalog, "PUT", { cookie, origin: "https://third.example" })).code, 403);
  assert.equal((await request(session, "DELETE", { cookie })).body.authenticated, false);
});

test("GET/PUT preserve opaque JSON and surface stale revisions as conflicts", async (t) => {
  const cookie = await login(t);
  const results = [[null, null], 1, -1, ["1", JSON.stringify(data)]];
  const commands = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    commands.push(JSON.parse(init.body));
    return provider(results.shift());
  });
  assert.deepEqual((await request(catalog, "GET", { cookie })).body, { revision: 0, data: null });
  const edit = { cookie, body: { revision: 0, data } };
  assert.deepEqual((await request(catalog, "PUT", edit)).body, { revision: 1 });
  assert.equal((await request(catalog, "PUT", edit)).code, 409);
  assert.deepEqual((await request(catalog, "GET", { cookie })).body, { revision: 1, data });
  assert.deepEqual(commands[1].slice(-3), ["0", "1", JSON.stringify(data)]);
});

test("TMDb allows only movie search/details and uses the configured server key", async (t) => {
  assert.equal((await request(tmdb, "GET", { url: "/api/tmdb?id=1" })).code, 401);
  const cookie = await login(t);
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(url);
    return Response.json({ results: [] });
  });
  assert.equal((await request(tmdb, "GET", { cookie, url: "/api/tmdb?id=../account" })).code, 400);
  assert.equal((await request(tmdb, "GET", { cookie, url: "/api/tmdb?query=Teste&year=2024" })).code, 200);
  assert.equal((await request(tmdb, "GET", { cookie, url: "/api/tmdb?id=10" })).code, 200);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].origin + requests[0].pathname, "https://api.themoviedb.org/3/search/movie");
  assert.equal(requests[0].searchParams.get("api_key"), process.env.TMDB_API_KEY);
  assert.equal(requests[0].searchParams.get("year"), "2024");
  assert.equal(requests[1].pathname, "/3/movie/10");
});
