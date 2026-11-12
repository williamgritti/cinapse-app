const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

let cloudEnabled = false;
let apiKey = "";
try {
  apiKey = localStorage.getItem("cinapse-tmdb-key") || "";
} catch {
  // The server proxy also works when browser storage is unavailable.
}

export function setCloudEnabled(enabled) {
  cloudEnabled = enabled;
}

export function setApiKey(key) {
  apiKey = key;
  localStorage.setItem("cinapse-tmdb-key", key);
}

export function getApiKey() {
  return apiKey;
}

export function hasApiKey() {
  return cloudEnabled || !!apiKey;
}

export function posterUrl(path, size = "w342") {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

export function backdropUrl(path) {
  if (!path) return null;
  return `${IMG_BASE}/w1280${path}`;
}

export async function searchMovies(query, year, { limit = 12 } = {}) {
  if (!hasApiKey()) throw new Error("API key não configurada");
  const params = new URLSearchParams({ query });
  if (year) params.set("year", year);
  let path = "/api/tmdb";
  if (!cloudEnabled) {
    path = `${TMDB_BASE}/search/movie`;
    params.set("api_key", apiKey);
    params.set("language", "pt-BR");
    params.set("page", "1");
  }
  const res = await fetch(`${path}?${params}`);
  if (cloudEnabled && res.status === 401) throw new Error("Entre novamente para buscar no TMDb.");
  if (!res.ok) throw new Error(`TMDb API: ${res.status}`);
  const data = await res.json();
  return (data.results || []).slice(0, limit);
}

export async function getMovieDetails(id) {
  if (!hasApiKey() || !id) return null;
  try {
    const url = cloudEnabled
      ? `/api/tmdb?id=${encodeURIComponent(id)}`
      : `${TMDB_BASE}/movie/${encodeURIComponent(id)}?${new URLSearchParams({
        api_key: apiKey, language: "pt-BR", append_to_response: "credits,watch/providers",
      })}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function extractStreamingBR(details) {
  if (!details?.["watch/providers"]?.results?.BR) return [];
  const br = details["watch/providers"].results.BR;
  const services = [];
  if (br.flatrate) {
    br.flatrate.forEach(s => services.push({ name: s.provider_name, type: "sub" }));
  }
  if (br.rent) {
    br.rent.slice(0, 3).forEach(s => services.push({ name: s.provider_name, type: "rent" }));
  }
  if (br.buy) {
    br.buy.slice(0, 2).forEach(s => services.push({ name: s.provider_name, type: "buy" }));
  }
  if (br.free) {
    br.free.forEach(s => services.push({ name: s.provider_name, type: "free" }));
  }
  return services;
}

const GENRE_MAP = {
  28: "Ação", 12: "Aventura", 16: "Animação", 35: "Comédia", 80: "Crime",
  99: "Documentário", 18: "Drama", 10751: "Família", 14: "Fantasia", 36: "História",
  27: "Terror", 10402: "Música", 9648: "Mistério", 10749: "Romance", 878: "Ficção Científica",
  10770: "Cinema TV", 53: "Suspense", 10752: "Guerra", 37: "Faroeste"
};

export function genreNames(ids) {
  return (ids || []).map(id => GENRE_MAP[id] || `${id}`);
}

export async function enrichMovie(movie) {
  const details = await getMovieDetails(movie.id);
  return {
    id: movie.id,
    tmdb_id: movie.id,
    title: movie.title || details?.title,
    original_title: movie.original_title || details?.original_title,
    year: (movie.release_date || details?.release_date || "").slice(0, 4),
    poster_path: movie.poster_path || details?.poster_path,
    backdrop_path: movie.backdrop_path || details?.backdrop_path,
    overview: movie.overview || details?.overview || "",
    genres: genreNames(movie.genre_ids || details?.genres?.map(g => g.id) || []),
    rating: movie.vote_average || details?.vote_average || 0,
    runtime: details?.runtime || 0,
    director: details?.credits?.crew?.find(c => c.job === "Director")?.name || "",
    cast: details?.credits?.cast?.slice(0, 5).map(c => c.name) || [],
    streaming: extractStreamingBR(details),
  };
}

const POSTER_YEAR_TOLERANCE = 1;

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function releaseYearOf(movie) {
  const year = parseInt(String(movie?.release_date || movie?.year || "").slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function sameTitle(result, names) {
  const got = [result?.title, result?.original_title].map(normalizeName).filter(Boolean);
  return names.some(name => got.includes(name));
}

function samePerson(a, b) {
  const left = normalizeName(a).split(" ").filter(part => part.length > 1);
  const right = new Set(normalizeName(b).split(" ").filter(part => part.length > 1));
  if (!left.length || !right.size) return false;
  const shared = left.filter(part => right.has(part));
  return shared.length >= 2 || shared.length === left.length || shared.length === right.size;
}

function posterQueries(movie) {
  const raw = [movie.title, movie.original_title].map(value => String(value || "").trim()).filter(Boolean);
  const folded = raw.map(normalizeName).filter(value => value && !raw.some(item => item.toLowerCase() === value));
  const seen = new Set();
  const queries = [];
  for (const query of [...raw, ...folded]) {
    const key = query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    queries.push(query);
  }
  return queries;
}

function eligibleCandidates(results, movie, yearScoped) {
  const names = [movie.title, movie.original_title].map(normalizeName).filter(Boolean);
  const target = Number(movie.year);
  const knownTarget = Number.isFinite(target);
  const ranked = [];
  for (const result of results || []) {
    if (!result?.id) continue;
    const hit = sameTitle(result, names);
    const year = releaseYearOf(result);
    const distance = year == null || !knownTarget ? null : Math.abs(year - target);
    const inWindow = distance !== null && distance <= POSTER_YEAR_TOLERANCE;
    const ok = inWindow || (yearScoped && hit && distance === null) || (!knownTarget && hit);
    if (!ok) continue;
    ranked.push({ result, hit, distance: distance ?? 0 });
  }
  ranked.sort((a, b) => Number(b.hit) - Number(a.hit) || a.distance - b.distance);
  return ranked;
}

async function matchDirector(items, movie) {
  if (!movie.director) return items.length === 1 ? items[0].result : null;
  let unresolved = false;
  for (const item of items) {
    const details = await getMovieDetails(item.result.id);
    const directors = (details?.credits?.crew || []).filter(person => person.job === "Director" && person.name);
    if (!details) {
      unresolved = true;
      continue;
    }
    if (directors.some(person => samePerson(person.name, movie.director))) {
      return { ...item.result, poster_path: item.result.poster_path || details.poster_path || null };
    }
  }
  if (items.length === 1 && unresolved) return items[0].result;
  return null;
}

async function choosePoster(results, movie, yearScoped) {
  const ranked = eligibleCandidates(results, movie, yearScoped);
  const withPoster = ranked.filter(item => item.result.poster_path);
  const hits = withPoster.filter(item => item.hit);
  const pool = hits.length ? hits : withPoster;
  if (!pool.length) return null;
  const tied = pool.filter(item => item.distance === pool[0].distance);
  if (tied.length === 1 && (tied[0].hit || !movie.director)) return tied[0].result;
  return matchDirector(tied, movie);
}

// Busca o pôster por título e ano. O ano do TMDb pode divergir um ano do
// catálogo, e o título em português pode não ser o título indexado.
export async function fetchPosterPath(title, year, hints = {}) {
  if (!hasApiKey()) return null;
  const movie = {
    title: title || "",
    original_title: hints.originalTitle || hints.original_title || "",
    year: year || "",
    director: hints.director || "",
  };
  for (const query of posterQueries(movie)) {
    const attempts = movie.year ? [movie.year, undefined] : [undefined];
    for (const attemptYear of attempts) {
      const results = await searchMovies(query, attemptYear, { limit: 20 });
      const chosen = await choosePoster(results, movie, Boolean(attemptYear));
      if (chosen?.poster_path) return { poster_path: chosen.poster_path, tmdb_id: chosen.id };
    }
  }
  return null;
}

export function posterFetchMessage(outcome) {
  const updated = outcome?.updated || [];
  const missed = outcome?.missed || [];
  const errors = outcome?.errors || [];
  const label = movie => movie.year ? `${movie.title} (${movie.year})` : movie.title;
  if (errors.length) {
    const prefix = updated.length ? `Atualizei ${updated.length} pôster${updated.length === 1 ? "" : "es"}. ` : "";
    return prefix + errors[0];
  }
  if (missed.length === 1) return `Não encontrei pôster para ${label(missed[0])}.`;
  if (missed.length > 1) return `Não encontrei pôster para: ${missed.map(label).join(", ")}.`;
  return "Pôsteres atualizados!";
}

// Batch fetch posters for movies missing them (with rate limiting)
export async function fetchMissingPosters(movies, onUpdate) {
  const outcome = { updated: [], missed: [], errors: [] };
  if (!hasApiKey()) {
    outcome.errors.push("API key não configurada");
    return outcome;
  }
  const missing = (movies || []).filter(movie => movie && !movie.poster_path);
  for (let index = 0; index < missing.length; index++) {
    const movie = missing[index];
    try {
      const result = await fetchPosterPath(movie.title, movie.year, {
        originalTitle: movie.original_title,
        director: movie.director,
      });
      if (result?.poster_path) {
        onUpdate?.(movie.id, { poster_path: result.poster_path, tmdb_id: result.tmdb_id });
        outcome.updated.push({ title: movie.title, year: movie.year });
      } else {
        outcome.missed.push({ title: movie.title, year: movie.year });
      }
    } catch (error) {
      const message = error?.message || "Falha ao consultar o TMDb.";
      if (!outcome.errors.includes(message)) outcome.errors.push(message);
    }
    if (index < missing.length - 1) await new Promise(resolve => setTimeout(resolve, 50));
  }
  return outcome;
}
