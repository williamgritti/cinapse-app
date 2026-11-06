export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// The Vercel Node runtime supplies req.body and the status/json helpers.
export function endpoint(methods, handle) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      if (!methods.includes(req.method)) {
        res.setHeader("Allow", methods.join(", "));
        throw new HttpError(405, "Método indisponível.");
      }
      // Browsers send Origin on mutations. Require an exact origin, including
      // the protocol and port, rather than sharing authority with other subdomains.
      const protocol = req.headers["x-forwarded-proto"] || (req.socket?.encrypted ? "https" : "http");
      const origin = req.headers.origin;
      if ((req.method !== "GET" || origin) && origin !== protocol + "://" + req.headers.host) {
        throw new HttpError(403, "Origem inválida.");
      }
      if (req.headers["sec-fetch-site"] === "cross-site") {
        throw new HttpError(403, "Origem inválida.");
      }
      const response = await handle(req, res);
      return res.status(200).json(response);
    } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
      // Do not return raw provider errors, request bodies, credentials or URLs.
      return res.status(503).json({ error: "Serviço temporariamente indisponível. Tente novamente." });
    }
  };
}

export function jsonBody(req, maxBytes) {
  if ((req.headers["content-type"] || "").split(";")[0].trim() !== "application/json") {
    throw new HttpError(415, "Envie o conteúdo como JSON.");
  }
  if (Number(req.headers["content-length"]) > maxBytes) throw new HttpError(413, "Arquivo muito grande.");
  try {
    const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > maxBytes) throw new HttpError(413, "Arquivo muito grande.");
    const body = typeof req.body === "string" ? JSON.parse(raw) : req.body;
    if (body && typeof body === "object" && !Array.isArray(body)) return body;
  } catch (err) {
    if (err instanceof HttpError) throw err;
  }
  throw new HttpError(400, "JSON inválido.");
}
