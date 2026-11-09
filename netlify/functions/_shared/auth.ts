// Shared cookie-based session helper for the trap viewer/manager.
//
// "viewer" role can see the gallery; "admin" role can also delete. Sessions are a
// short-lived HMAC-signed token (role + expiry) in an HttpOnly cookie — no server-side
// session store needed. TRAP_AUTH_SECRET must be set in Netlify env vars.

import { createHmac, timingSafeEqual } from "node:crypto";

export type Role = "viewer" | "admin";

const COOKIE_NAME = "trap_auth";
const SESSION_HOURS = 12;

function getSecret(): string {
  const secret = process.env.TRAP_AUTH_SECRET;
  if (!secret) throw new Error("TRAP_AUTH_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionCookie(role: Role): string {
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ role, exp })).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${
    SESSION_HOURS * 60 * 60
  }`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

export function getSession(req: Request): { role: Role } | null {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { role, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof exp !== "number" || Date.now() > exp) return null;
    if (role !== "viewer" && role !== "admin") return null;
    return { role };
  } catch {
    return null;
  }
}

/** Admin requires the admin role specifically; viewer is satisfied by either role. */
export function requireRole(req: Request, role: Role): boolean {
  const session = getSession(req);
  if (!session) return false;
  return role === "admin" ? session.role === "admin" : true;
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
