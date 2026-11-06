import { authenticated, checkPassword, configured, requireConfig, setSession } from "../server/cloud.js";
import { endpoint, HttpError, jsonBody } from "../server/http.js";

export default endpoint(["GET", "POST", "DELETE"], async (req, res) => {
  let signedIn = authenticated(req);
  if (req.method === "POST") {
    requireConfig();
    const { password } = jsonBody(req, 4096);
    if (typeof password !== "string") throw new HttpError(400, "Informe a senha do catálogo.");
    await checkPassword(req, password);
    setSession(req, res, true);
    signedIn = true;
  } else if (req.method === "DELETE") {
    setSession(req, res, false);
    signedIn = false;
  }
  return { configured: configured(), authenticated: signedIn, tmdbConfigured: Boolean(process.env.TMDB_API_KEY) };
});
