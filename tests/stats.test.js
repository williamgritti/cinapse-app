import assert from "node:assert/strict";
import test from "node:test";
import { aggregateCatalog } from "../src/stats.js";

const movie = (overrides) => ({
  id: overrides.id ?? overrides.title,
  title: overrides.title ?? "Filme",
  ...overrides,
});

test("catálogo vazio ou inválido não inventa números", () => {
  for (const input of [[], null, undefined, "catálogo"]) {
    const stats = aggregateCatalog(input);
    assert.equal(stats.empty, input == null || !Array.isArray(input) || input.length === 0);
    assert.deepEqual(stats.totals, { quero_ver: 0, assistido: 0, abandonado: 0, outros: 0, total: 0 });
    assert.equal(stats.hoursWatched, 0);
    assert.equal(stats.minutesWatched, 0);
    assert.deepEqual(stats.months, []);
    assert.equal(stats.monthBasis, null);
    assert.equal(stats.monthCaption, "");
    assert.deepEqual(stats.ratingByGenre, []);
    assert.deepEqual(stats.ratingByDirector, []);
    assert.deepEqual(stats.topGenres, []);
    assert.deepEqual(stats.topDirectors, []);
  }
});

test("conta os três status e isola o que não é um deles", () => {
  const stats = aggregateCatalog([
    movie({ title: "A", status: "quero_ver" }),
    movie({ title: "B", status: "quero_ver" }),
    movie({ title: "C", status: "assistido" }),
    movie({ title: "D", status: "abandonado" }),
    movie({ title: "E", status: "emprestado" }),
    movie({ title: "F" }),
    null,
  ]);
  assert.equal(stats.empty, false);
  assert.deepEqual(stats.totals, { quero_ver: 2, assistido: 1, abandonado: 1, outros: 2, total: 6 });
});

test("soma só a duração dos assistidos e ignora ficha sem runtime", () => {
  const stats = aggregateCatalog([
    movie({ title: "Longo", status: "assistido", runtime: 125 }),
    movie({ title: "Curto", status: "assistido", runtime: 55 }),
    movie({ title: "Sem ficha", status: "assistido", runtime: 0 }),
    movie({ title: "Lista", status: "quero_ver", runtime: 180 }),
    movie({ title: "Parei", status: "abandonado", runtime: 90 }),
    movie({ title: "Ruim", status: "assistido", runtime: -10 }),
  ]);
  assert.equal(stats.minutesWatched, 180);
  assert.equal(stats.hoursWatched, 3);
  assert.equal(stats.watchedWithoutRuntime, 2);
});

test("agrupa assistidos pelo mês de addedAt e preenche os meses vazios", () => {
  const stats = aggregateCatalog([
    movie({ title: "Jan 1", status: "assistido", addedAt: Date.UTC(2026, 0, 4) }),
    movie({ title: "Jan 2", status: "assistido", addedAt: Date.UTC(2026, 0, 28) }),
    movie({ title: "Quero", status: "quero_ver", addedAt: Date.UTC(2026, 0, 10) }),
    movie({ title: "Parei", status: "abandonado", addedAt: Date.UTC(2026, 1, 2) }),
    movie({ title: "Mar", status: "assistido", addedAt: Date.UTC(2026, 2, 2) }),
    movie({ title: "Sem data", status: "assistido" }),
    movie({ title: "Zero", status: "assistido", addedAt: 0 }),
  ]);
  assert.equal(stats.monthBasis, "addedAt");
  assert.match(stats.monthCaption, /adicionado/i);
  assert.match(stats.monthCaption, /não guarda a data/i);
  assert.equal(stats.watchedUndated, 2);
  assert.deepEqual(stats.months.map(m => [m.key, m.label, m.count]), [
    ["2026-01", "jan 2026", 2],
    ["2026-02", "fev 2026", 0],
    ["2026-03", "mar 2026", 1],
  ]);
});

test("prefere uma data de sessão quando ela existe", () => {
  const stats = aggregateCatalog([
    movie({
      title: "Com sessão",
      status: "assistido",
      watchedAt: Date.UTC(2025, 11, 20),
      addedAt: Date.UTC(2026, 0, 2),
    }),
  ]);
  assert.equal(stats.monthBasis, "watchedAt");
  assert.deepEqual(stats.months.map(m => [m.key, m.count]), [["2025-12", 1]]);
  assert.doesNotMatch(stats.monthCaption, /adicionado ao catálogo/i);
});

test("mistura data de sessão e addedAt sem esconder a origem", () => {
  const stats = aggregateCatalog([
    movie({ title: "Sessão", status: "assistido", seenAt: Date.UTC(2026, 3, 2) }),
    movie({ title: "Ficha", status: "assistido", addedAt: Date.UTC(2026, 4, 2) }),
  ]);
  assert.equal(stats.monthBasis, "misto");
  assert.match(stats.monthCaption, /adicionado/i);
  assert.deepEqual(stats.months.map(m => [m.key, m.count]), [
    ["2026-04", 1],
    ["2026-05", 1],
  ]);
});

test("média por gênero exige duas notas e conta o filme em cada gênero", () => {
  const stats = aggregateCatalog([
    movie({ title: "A", status: "assistido", genres: ["Terror", "Terror", " Drama "], myRating: 5 }),
    movie({ title: "B", status: "assistido", genres: ["Terror"], myRating: 3 }),
    movie({ title: "C", status: "quero_ver", genres: ["Drama"], myRating: 4 }),
    movie({ title: "D", status: "assistido", genres: ["Terror"], myRating: 0 }),
    movie({ title: "E", status: "assistido", genres: ["Crime"], myRating: 5 }),
    movie({ title: "F", status: "assistido", genres: ["  "], myRating: 5 }),
  ]);
  assert.deepEqual(stats.ratingByGenre, [
    { name: "Drama", count: 2, average: 4.5 },
    { name: "Terror", count: 2, average: 4 },
  ]);
});

test("média por diretor ignora nome vazio e pede duas notas", () => {
  const stats = aggregateCatalog([
    movie({ title: "A", director: " Ari Aster ", myRating: 5, status: "assistido" }),
    movie({ title: "B", director: "Ari Aster", myRating: 4, status: "assistido" }),
    movie({ title: "C", director: "Ari Aster", myRating: 0, status: "assistido" }),
    movie({ title: "D", director: "Gaspar Noé", myRating: 5, status: "assistido" }),
    movie({ title: "E", director: "   ", myRating: 5, status: "assistido" }),
    movie({ title: "F", myRating: 5, status: "assistido" }),
  ]);
  assert.deepEqual(stats.ratingByDirector, [
    { name: "Ari Aster", count: 2, average: 4.5 },
  ]);
});

test("ordena médias pela nota, depois pela quantidade", () => {
  const stats = aggregateCatalog([
    movie({ title: "A", director: "Beta", genres: ["Zeta"], myRating: 3 }),
    movie({ title: "B", director: "Beta", genres: ["Zeta"], myRating: 3 }),
    movie({ title: "C", director: "Beta", genres: ["Zeta"], myRating: 3 }),
    movie({ title: "D", director: "Alfa", genres: ["Alfa"], myRating: 5 }),
    movie({ title: "E", director: "Alfa", genres: ["Alfa"], myRating: 5 }),
    movie({ title: "F", director: "Gama", genres: ["Gama"], myRating: 5 }),
    movie({ title: "G", director: "Gama", genres: ["Gama"], myRating: 1 }),
  ]);
  assert.deepEqual(stats.ratingByDirector.map(row => row.name), ["Alfa", "Beta", "Gama"]);
  assert.deepEqual(stats.ratingByGenre.map(row => [row.name, row.average, row.count]), [
    ["Alfa", 5, 2],
    ["Zeta", 3, 3],
    ["Gama", 3, 2],
  ]);
});

test("frequência usa o catálogo inteiro e desempata pelo nome", () => {
  const stats = aggregateCatalog([
    movie({ title: "A", status: "quero_ver", director: "Zeta", genres: ["Terror", "Drama"] }),
    movie({ title: "B", status: "abandonado", director: "Zeta", genres: ["Terror"] }),
    movie({ title: "C", status: "assistido", director: "Alfa", genres: ["Drama"] }),
    movie({ title: "D", status: "assistido", director: "Beta", genres: ["Crime"] }),
    movie({ title: "E", status: "assistido", director: "", genres: [] }),
  ]);
  assert.deepEqual(stats.topDirectors, [
    { name: "Zeta", count: 2 },
    { name: "Alfa", count: 1 },
    { name: "Beta", count: 1 },
  ]);
  assert.deepEqual(stats.topGenres, [
    { name: "Drama", count: 2 },
    { name: "Terror", count: 2 },
    { name: "Crime", count: 1 },
  ]);
});
