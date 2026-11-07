// Preenche poster_path e tmdb_id das entradas já existentes em src/db.js.
//
// Uso:
//   TMDB_API_KEY=sua_chave npm run backfill-posters
//
// O script lê cada filme sem poster_path, busca no TMDb por título e ano
// (e, se preciso, pelo título original) e grava os dois campos na própria linha.
// Não inventa dados: se a chave não existir, o processo termina com erro;
// se o filme não for encontrado, a linha permanece como está.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "src", "db.js");
const ENTRY_RE = /^(\s*)\{title:"((?:[^"\\]|\\.)*)",original_title:"((?:[^"\\]|\\.)*)",year:"(\d{4})"/;

function unescapeJsString(value) {
  return value.replace(/\\(.)/g, (_, char) => (char === "n" ? "\n" : char === "r" ? "\r" : char === "t" ? "\t" : char));
}

function jsString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function parseMovieLine(line) {
  if (line.includes("poster_path:")) return null;
  const match = line.match(ENTRY_RE);
  if (!match) return null;
  return {
    title: unescapeJsString(match[2]),
    original_title: unescapeJsString(match[3]),
    year: match[4],
  };
}

export function applyPosterFields(line, posterPath, tmdbId) {
  if (!Number.isInteger(tmdbId)) throw new Error("tmdb_id inválido");
  const poster = posterPath ? jsString(posterPath) : "null";
  const fields = `poster_path:${poster},tmdb_id:${tmdbId}`;
  if (line.endsWith("},")) return `${line.slice(0, -2)},${fields}},`;
  if (line.endsWith("}")) return `${line.slice(0, -1)},${fields}}`;
  throw new Error("entrada sem fechamento");
}

function invokedDirectly() {
  const entry = process.argv[1];
  return Boolean(entry) && path.resolve(entry) === fileURLToPath(import.meta.url);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tmdb(endpoint, params = {}, attempt = 0) {
  const apiKey = process.env.TMDB_API_KEY;
  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "pt-BR");
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  const res = await fetch(url);
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt;
    await delay(wait);
    return tmdb(endpoint, params, attempt + 1);
  }
  if (!res.ok) throw new Error(`TMDb ${endpoint}: ${res.status}`);
  return res.json();
}

function releaseYear(movie) {
  const year = parseInt((movie.release_date || "").slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

async function search(query, year) {
  const data = await tmdb("/search/movie", { query, year, include_adult: "true" });
  const results = data.results || [];
  const target = Number(year);
  return results.find((movie) => {
    const got = releaseYear(movie);
    return got != null && Math.abs(got - target) <= 1;
  }) || null;
}

async function findMovie(title, originalTitle, year) {
  const primary = await search(title, year);
  if (primary) return primary;
  if (originalTitle && originalTitle.toLowerCase() !== title.toLowerCase()) {
    await delay(250);
    return search(originalTitle, year);
  }
  return null;
}

function safeError(error) {
  const apiKey = process.env.TMDB_API_KEY;
  const message = error?.message || String(error);
  return apiKey ? message.split(apiKey).join("[redacted]") : message;
}

async function main() {
  if (!process.env.TMDB_API_KEY) {
    console.error("Erro: defina TMDB_API_KEY no ambiente.");
    console.error("Exemplo: TMDB_API_KEY=sua_chave npm run backfill-posters");
    process.exit(1);
  }

  const text = await fs.readFile(DB_PATH, "utf8");
  const lines = text.split("\n");
  const pending = [];
  let alreadyFilled = 0;
  for (let index = 0; index < lines.length; index++) {
    if (ENTRY_RE.test(lines[index]) && lines[index].includes("poster_path:")) alreadyFilled++;
    const movie = parseMovieLine(lines[index]);
    if (movie) pending.push({ index, ...movie });
  }

  console.log(`${pending.length} filmes sem poster_path; ${alreadyFilled} já preenchidos.\n`);

  let filled = 0;
  let withoutPoster = 0;
  let missing = 0;
  let failed = 0;

  for (let index = 0; index < pending.length; index++) {
    const movie = pending[index];
    process.stdout.write(`[${index + 1}/${pending.length}] ${movie.title} (${movie.year})... `);
    try {
      const hit = await findMovie(movie.title, movie.original_title, movie.year);
      if (!hit) {
        console.log("não encontrado");
        missing++;
      } else {
        lines[movie.index] = applyPosterFields(lines[movie.index], hit.poster_path || null, hit.id);
        if (hit.poster_path) {
          console.log(`pôster ${hit.poster_path} (#${hit.id})`);
          filled++;
        } else {
          console.log(`sem pôster no TMDb (#${hit.id})`);
          withoutPoster++;
        }
      }
    } catch (error) {
      console.log(`erro: ${safeError(error)}`);
      failed++;
    }
    if (index < pending.length - 1) await delay(250);
  }

  if (filled + withoutPoster > 0) {
    const next = lines.join("\n");
    if (next !== text) await fs.writeFile(DB_PATH, next);
    console.log(`\n${DB_PATH} atualizado.`);
  } else {
    console.log("\nNada para gravar.");
  }

  console.log(`Pôsteres preenchidos: ${filled}`);
  console.log(`Encontrados sem pôster: ${withoutPoster}`);
  console.log(`Não encontrados: ${missing}`);
  console.log(`Erros: ${failed}`);
  if (failed) process.exit(1);
}

if (invokedDirectly()) {
  main().catch((error) => {
    console.error(safeError(error));
    process.exit(1);
  });
}
