import { requireSession, redis } from "../server/cloud.js";
import { endpoint, HttpError, jsonBody } from "../server/http.js";
import { isCatalogData } from "../shared/catalog.js";

const CATALOG_KEY = "cinapse:catalog:v1";
// Compare and replace inside Redis, across all browser and function instances.
// Keep JSON opaque to Lua so fractional legacy IDs retain their JS precision.
const SAVE_SCRIPT = `
  local current = redis.call('HGET', KEYS[1], 'revision') or '0'
  if current ~= ARGV[1] then return -1 end
  redis.call('HSET', KEYS[1], 'revision', ARGV[2], 'data', ARGV[3])
  return tonumber(ARGV[2])
`;

export default endpoint(["GET", "PUT"], async (req) => {
  requireSession(req);
  if (req.method === "GET") {
    const [storedRevision, raw] = await redis(["HMGET", CATALOG_KEY, "revision", "data"]);
    if (storedRevision === null && raw === null) return { revision: 0, data: null };
    const revision = Number(storedRevision);
    const data = JSON.parse(raw);
    if (!Number.isSafeInteger(revision) || revision < 1 || !isCatalogData(data)) throw new Error("Dados inválidos");
    return { revision, data };
  }
  const { revision, data } = jsonBody(req, 3 * 1024 * 1024);
  if (!Number.isSafeInteger(revision) || revision < 0 || !Number.isSafeInteger(revision + 1) || !isCatalogData(data)) {
    throw new HttpError(400, "O formato do catálogo é inválido.");
  }
  const next = await redis(["EVAL", SAVE_SCRIPT, 1, CATALOG_KEY, String(revision), String(revision + 1), JSON.stringify(data)]);
  if (next === -1) throw new HttpError(409, "O catálogo foi alterado em outro dispositivo.");
  if (next !== revision + 1) throw new Error("Gravação não confirmada");
  return { revision: next };
});
