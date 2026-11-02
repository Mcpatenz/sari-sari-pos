import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

/**
 * Pure auth primitives shared by the proxy, route handlers and server code.
 * No `next/*` imports here so it is safe to run in the Node.js proxy runtime.
 */

export type SessionRole = "SUPER_ADMIN" | "OWNER" | "CASHIER";

export type SessionPayload = {
  userId: string;
  storeId: string;
  role: SessionRole;
  name: string;
  email: string | null;
  // Must match User.sessionVersion so a logout-everywhere can revoke sessions.
  sessionVersion: number;
  exp: number;
};

export const SESSION_COOKIE = "tindahan_session";
// Readable (non-httpOnly) companion cookie. It only carries the opaque store id
// so the offline client database can be namespaced per store. It is never
// trusted by the server for authorization.
export const STORE_COOKIE = "tindahan_store";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const SESSION_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000);

const DEV_SECRET = "dev-insecure-secret-change-me-in-production";
// A short signing key is brute-forceable, which would let an attacker forge
// session cookies for any account or store.
const MIN_SECRET_LENGTH = 32;

/**
 * Resolve the signing secret lazily so a production build cannot silently run
 * with the insecure development fallback.
 */
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length > 0) {
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`,
      );
    }
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is not set. Refusing to sign or verify sessions in production.",
    );
  }
  return DEV_SECRET;
}

/** Landing route after sign-in, based on the user's role. */
export function homeForRole(role: SessionRole): string {
  if (role === "SUPER_ADMIN") return "/super-admin";
  return role === "OWNER" ? "/dashboard" : "/cashier";
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = { ...payload, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  const signature = createHmac("sha256", getAuthSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined | null,
): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = createHmac("sha256", getAuthSecret())
    .update(body)
    .digest("base64url");
  const provided = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
