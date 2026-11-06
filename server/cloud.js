import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";

const COOKIE = "cinapse_session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

export function configured() {
  const { CINAPSE_PASSWORD, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;
  if (!CINAPSE_PASSWORD || CINAPSE_PASSWORD.trim().length < 16 || !UPSTASH_REDIS_REST_TOKEN) return false;
  try {
    const url = new URL(UPSTASH_REDIS_REST_URL);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  } catch {
    return false;
  }
}

export function requireConfig() {
  if (!configured()) throw new HttpError(503, "A sincronização precisa ser configurada no servidor.");
}

export async function redis(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.UPSTASH_REDIS_REST_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Redis indisponível");
  const reply = await response.json();
  if (reply.error || !Object.hasOwn(reply, "result")) throw new Error("Falha no comando Redis");
  return reply.result;
}

function sign(label, value) {
  return createHmac("sha256", process.env.UPSTASH_REDIS_REST_TOKEN)
    .update(JSON.stringify([label, process.env.CINAPSE_PASSWORD, value]))
    .digest("base64url");
}

export function matchesSecret(a, b) {
  const digest = (s) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function authenticated(req) {
  if (!configured()) return false;
  const value = (req.headers.cookie || "").split(";").map((c) => c.trim()).find((c) => c.startsWith(COOKIE + "="));
  if (!value) return false;
  const match = /^(\d{10,11})\.([\w-]{22})\.([\w-]{43})$/.exec(value.slice(COOKIE.length + 1));
  if (!match || Number(match[1]) <= Date.now() / 1000) return false;
  return matchesSecret(match[3], sign("session", match[1] + "." + match[2]));
}

export function requireSession(req) {
  requireConfig();
  if (!authenticated(req)) throw new HttpError(401, "Entre para acessar o catálogo sincronizado.");
}

export function setSession(req, res, enabled) {
  let value = "";
  if (enabled) {
    const payload = (Math.floor(Date.now() / 1000) + SESSION_SECONDS) + "." + randomBytes(16).toString("base64url");
    value = payload + "." + sign("session", payload);
  }
  const secure = req.headers["x-forwarded-proto"] === "https" || req.socket?.encrypted ||
    ["preview", "production"].includes(process.env.VERCEL_ENV);
  res.setHeader("Set-Cookie", COOKIE + "=" + value + "; Path=/api; HttpOnly; SameSite=Strict; Max-Age=" +
    (enabled ? SESSION_SECONDS : 0) + (secure ? "; Secure" : ""));
}

// Count wrong passwords per address for 15 min on the server, across all
// function instances. Checking the limit and incrementing it must be atomic.
const LOGIN_SCRIPT = `
  if tonumber(redis.call('GET', KEYS[1]) or '0') >= 10 then return -1 end
  if ARGV[1] == '1' then
    redis.call('DEL', KEYS[1])
    return 1
  end
  if redis.call('INCR', KEYS[1]) == 1 then redis.call('EXPIRE', KEYS[1], 900) end
  return 0
`;

export async function checkPassword(req, password) {
  const valid = matchesSecret(password, process.env.CINAPSE_PASSWORD);
  const edgeIp = process.env.VERCEL === "1" && req.headers["x-vercel-forwarded-for"];
  const ip = edgeIp || req.socket?.remoteAddress || "local";
  const result = await redis(["EVAL", LOGIN_SCRIPT, 1, "cinapse:login:" + sign("rate", ip), valid ? "1" : "0"]);
  if (result === -1) throw new HttpError(429, "Muitas tentativas. Tente novamente em 15 minutos.");
  if (result !== 1) throw new HttpError(401, "Senha incorreta.");
}
