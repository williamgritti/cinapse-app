import { requireSession } from "../server/cloud.js";
import { endpoint, HttpError } from "../server/http.js";

export default endpoint(["GET"], async (req) => {
  requireSession(req);
  if (!process.env.TMDB_API_KEY) throw new HttpError(503, "Configure a chave do TMDb no servidor.");
  const params = new URL(req.url, "http://localhost").searchParams;
  const query = params.get("query")?.trim();
  const id = params.get("id");
  const year = params.get("year");
  let url;
  if (params.has("query") && !params.has("id") && query && query.length <= 250 && (year === null || /^\d{4}$/.test(year))) {
    url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("query", query);
    url.searchParams.set("page", "1");
    if (year) url.searchParams.set("year", year);
  } else if (params.has("id") && !params.has("query") && !params.has("year") && /^[1-9]\d{0,14}$/.test(id)) {
    url = new URL("https://api.themoviedb.org/3/movie/" + id);
    url.searchParams.set("append_to_response", "credits,watch/providers");
  } else {
    throw new HttpError(400, "Busca ou identificador de filme inválido.");
  }
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    if (response.status === 404) throw new HttpError(404, "Filme não encontrado no TMDb.");
    if (response.status === 429) throw new HttpError(429, "Limite de consultas ao TMDb atingido. Tente novamente.");
    throw new HttpError(502, "Falha na consulta ao TMDb. Verifique a chave do servidor.");
  }
  return response.json();
});
