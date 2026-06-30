// Popula src/db.js com novos filmes curados, buscando metadados no TMDb.
//
// Uso:
//   TMDB_API_KEY=sua_chave npm run populate-db
//
// O script:
//   1. Lê src/db.js e extrai title+year das entradas existentes (dedup)
//   2. Pra cada título da lista abaixo, busca no TMDb em pt-BR
//   3. Monta a entrada no formato exato do db.js
//   4. Anexa as novas entradas antes do fechamento do array
//   5. Pula títulos já presentes ou não encontrados
//
// Edite a constante TITLES pra adicionar/remover títulos.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "src", "db.js");

const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  console.error("Erro: defina TMDB_API_KEY no ambiente.");
  console.error("Exemplo: TMDB_API_KEY=xxxx npm run populate-db");
  process.exit(1);
}

// ─── LISTA CURADA (edite à vontade) ───
const TITLES = [
  // Recentes 2022-2024 (terror elevado / arthouse)
  { query: "Beau is Afraid", year: 2023 },
  { query: "Skinamarink", year: 2022 },
  { query: "Pearl", year: 2022 },
  { query: "X", year: 2022 },
  { query: "MaXXXine", year: 2024 },
  { query: "Longlegs", year: 2024 },
  { query: "Late Night with the Devil", year: 2023 },
  { query: "Speak No Evil", year: 2022 },
  { query: "Talk to Me", year: 2022 },
  { query: "Heretic", year: 2024 },
  { query: "The First Omen", year: 2024 },
  { query: "In a Violent Nature", year: 2024 },
  { query: "Saint Maud", year: 2019 },
  { query: "Censor", year: 2021 },
  { query: "Watcher", year: 2022 },

  // J-horror / Asiático (gaps)
  { query: "Ringu", year: 1998 },
  { query: "Ju-on: The Grudge", year: 2002 },
  { query: "Dark Water", year: 2002 },
  { query: "Noroi: The Curse", year: 2005 },
  { query: "Suicide Club", year: 2001 },

  // Folk / religioso
  { query: "November", year: 2017 },
  { query: "The Devils", year: 1971 },
  { query: "Don't Look Now", year: 1973 },

  // Body horror / weird
  { query: "Possession", year: 1981 },
  { query: "Spring", year: 2014 },
  { query: "The Endless", year: 2017 },
  { query: "Resolution", year: 2012 },
  { query: "Tusk", year: 2014 },

  // Lynch (gaps)
  { query: "Blue Velvet", year: 1986 },
  { query: "Lost Highway", year: 1997 },

  // Peter Strickland
  { query: "Berberian Sound Studio", year: 2012 },
  { query: "The Duke of Burgundy", year: 2014 },
  { query: "In Fabric", year: 2018 },

  // Latino / mexicano / argentino
  { query: "The Untamed", year: 2016 },
  { query: "Tigers Are Not Afraid", year: 2017 },
  { query: "We Are What We Are", year: 2010 },

  // Brasileiro (gaps)
  { query: "Mate-me Por Favor", year: 2015 },
  { query: "A Sombra do Pai", year: 2018 },
  { query: "Trabalhar Cansa", year: 2011 },

  // Misc cult / clássicos
  { query: "El Orfanato", year: 2007 },
  { query: "Memoria", year: 2021 },
  { query: "Verónica", year: 2017 },
  { query: "Carrie", year: 1976 },
  { query: "Eyes Without a Face", year: 1960 },
  { query: "The Tenant", year: 1976 },
  { query: "The Lure", year: 2015 },

  // Slow burn arthouse
  { query: "Beyond the Black Rainbow", year: 2010 },
  { query: "The House of the Devil", year: 2009 },
  { query: "The Innkeepers", year: 2011 },
  { query: "The Empty Man", year: 2020 },
];

// ─── MAPEAMENTO DE GÊNEROS (TMDb pt-BR → estilo do db.js) ───
const genreMap = {
  "Thriller": "Suspense",
  "Ficção científica": "Ficção Científica",
  "Cinema TV": "Drama",
  "TV Movie": "Drama",
};
const cleanGenre = (g) => genreMap[g] || g;

// ─── HELPERS ───
async function tmdb(endpoint, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", "pt-BR");
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDb ${endpoint}: ${res.status}`);
  return res.json();
}

async function findMovie(title, year) {
  const r1 = await tmdb("/search/movie", { query: title, year, include_adult: "true" });
  if (r1.results?.length) return r1.results[0];
  // tenta sem o ano (alguns títulos divergem por 1 ano)
  const r2 = await tmdb("/search/movie", { query: title, include_adult: "true" });
  if (r2.results?.length) {
    // se tiver ano, prefere o mais próximo
    if (year) {
      r2.results.sort((a, b) => {
        const ay = parseInt((a.release_date || "").slice(0, 4)) || 0;
        const by = parseInt((b.release_date || "").slice(0, 4)) || 0;
        return Math.abs(ay - year) - Math.abs(by - year);
      });
    }
    return r2.results[0];
  }
  return null;
}

async function fetchDetails(id) {
  return tmdb(`/movie/${id}`, { append_to_response: "credits" });
}

function buildEntry(details) {
  const director = details.credits?.crew?.find((c) => c.job === "Director")?.name || "";
  const cast = (details.credits?.cast || []).slice(0, 4).map((c) => c.name);
  const genres = (details.genres || []).map((g) => cleanGenre(g.name));
  const year = (details.release_date || "").slice(0, 4);
  return {
    title: details.title || details.original_title || "",
    original_title: details.original_title || details.title || "",
    year,
    director,
    genres,
    runtime: details.runtime || 0,
    rating: Math.round((details.vote_average || 0) * 10) / 10,
    overview: details.overview || "",
    cast,
    streaming: [],
  };
}

function jsString(s) {
  return `"${(s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function jsArrayOfStrings(arr) {
  return `[${(arr || []).map(jsString).join(",")}]`;
}

function formatEntry(e) {
  return (
    `  {title:${jsString(e.title)},` +
    `original_title:${jsString(e.original_title)},` +
    `year:${jsString(e.year)},` +
    `director:${jsString(e.director)},` +
    `genres:${jsArrayOfStrings(e.genres)},` +
    `runtime:${e.runtime},` +
    `rating:${e.rating},` +
    `overview:${jsString(e.overview)},` +
    `cast:${jsArrayOfStrings(e.cast)},` +
    `streaming:[]},`
  );
}

// ─── DEDUP via parsing simples do db.js como texto ───
async function readDbAndExtractKeys() {
  const text = await fs.readFile(DB_PATH, "utf8");
  const re = /\{title:"((?:[^"\\]|\\.)*)",original_title:"((?:[^"\\]|\\.)*)",year:"(\d{4})"/g;
  const keys = new Set();
  for (const m of text.matchAll(re)) {
    keys.add(`${m[1].toLowerCase()}|${m[3]}`);
    keys.add(`${m[2].toLowerCase()}|${m[3]}`);
  }
  return { text, keys };
}

// ─── MAIN ───
async function main() {
  console.log(`Lendo ${DB_PATH}...`);
  const { text, keys } = await readDbAndExtractKeys();
  console.log(`${keys.size / 2} entradas existentes (chaves de dedup)\n`);

  const newEntries = [];
  const skipped = [];

  for (let i = 0; i < TITLES.length; i++) {
    const { query, year } = TITLES[i];
    const label = `[${i + 1}/${TITLES.length}] ${query} (${year})`;
    process.stdout.write(`${label}... `);
    try {
      const hit = await findMovie(query, year);
      if (!hit) {
        console.log("✗ não encontrado");
        skipped.push({ query, year, reason: "não encontrado no TMDb" });
        continue;
      }
      const details = await fetchDetails(hit.id);
      const entry = buildEntry(details);
      const k1 = `${entry.title.toLowerCase()}|${entry.year}`;
      const k2 = `${entry.original_title.toLowerCase()}|${entry.year}`;
      if (keys.has(k1) || keys.has(k2)) {
        console.log("· já existe (skip)");
        skipped.push({ query, year, reason: "duplicado" });
        continue;
      }
      keys.add(k1);
      keys.add(k2);
      newEntries.push(entry);
      console.log(`✓ ${entry.title} (${entry.year}) — ${entry.director}`);
    } catch (e) {
      console.log(`✗ erro: ${e.message}`);
      skipped.push({ query, year, reason: e.message });
    }
    // Cortesia com a API do TMDb
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n${newEntries.length} novas entradas, ${skipped.length} pulados.`);

  if (newEntries.length === 0) {
    console.log("Nada pra escrever.");
    return;
  }

  // Inserir antes do fechamento do array
  const marker = "];\n\nexport function searchLocal";
  const idx = text.indexOf(marker);
  if (idx === -1) {
    console.error("\nNão consegui encontrar o fechamento `];` antes de `export function searchLocal` em db.js.");
    process.exit(1);
  }

  const header = `  // ─── ADICIONADO ${new Date().toISOString().slice(0, 10)} (${newEntries.length} filmes) ───\n`;
  const block = header + newEntries.map(formatEntry).join("\n") + "\n";
  const newText = text.slice(0, idx) + block + text.slice(idx);

  await fs.writeFile(DB_PATH, newText);
  console.log(`\n✓ ${DB_PATH} atualizado com ${newEntries.length} filmes.`);

  if (skipped.length) {
    console.log(`\nPulados:`);
    for (const s of skipped) console.log(`  · ${s.query} (${s.year}): ${s.reason}`);
  }

  console.log(`\nPróximos passos:`);
  console.log(`  git diff src/db.js   # revisa o que foi adicionado`);
  console.log(`  git add src/db.js && git commit -m 'Adiciona ${newEntries.length} filmes ao banco' && git push`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
