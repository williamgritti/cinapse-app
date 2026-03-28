const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

// API key is read from env or entered by user
let apiKey = localStorage.getItem("cinapse-tmdb-key") || "";

export function setApiKey(key) {
  apiKey = key;
  localStorage.setItem("cinapse-tmdb-key", key);
}

export function getApiKey() {
  return apiKey;
}

export function hasApiKey() {
  return !!apiKey;
}

export function posterUrl(path, size = "w342") {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

export function backdropUrl(path) {
  if (!path) return null;
  return `${IMG_BASE}/w1280${path}`;
}

export async function searchMovies(query) {
  if (!apiKey) throw new Error("API key não configurada");
  const res = await fetch(
    `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`
  );
  if (!res.ok) throw new Error(`TMDb API: ${res.status}`);
  const data = await res.json();
  return (data.results || []).slice(0, 12);
}

export async function getMovieDetails(id) {
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=credits,watch/providers`
    );
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

// Search TMDb for a poster path by title + year
export async function fetchPosterPath(title, year) {
  if (!apiKey) return null;
  try {
    const q = encodeURIComponent(title);
    const url = year
      ? `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${q}&year=${year}&language=pt-BR&page=1`
      : `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${q}&language=pt-BR&page=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const match = data.results?.[0];
    return match ? { poster_path: match.poster_path, tmdb_id: match.id } : null;
  } catch {
    return null;
  }
}

// Batch fetch posters for movies missing them (with rate limiting)
export async function fetchMissingPosters(movies, onUpdate) {
  if (!apiKey) return;
  const missing = movies.filter(m => !m.poster_path);
  for (let i = 0; i < missing.length; i++) {
    const m = missing[i];
    const result = await fetchPosterPath(m.title || m.original_title, m.year);
    if (result?.poster_path) {
      onUpdate(m.id, { poster_path: result.poster_path, tmdb_id: result.tmdb_id });
    }
    // Rate limit: 50ms between requests
    if (i < missing.length - 1) await new Promise(r => setTimeout(r, 50));
  }
}
