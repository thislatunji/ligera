import crypto from "crypto";

const getSecret = (type: "access" | "refresh") => {
  if (type === "access") {
    return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "access-secret-key-for-testing";
  }
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "refresh-secret-key-for-testing";
};

export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export interface AccessTokenPayload {
  sub: string;
  role: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

export interface GateTokenPayload {
  sub: string;
  role: string;
  type: "gate";
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signAccessToken(payload: { sub: string; role: string }): Promise<string> {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, type: "access", iat: now, exp: now + ACCESS_TOKEN_MAX_AGE }));
  const signature = crypto.createHmac("sha256", getSecret("access")).update(`${header}.${body}`).digest();
  return `${header}.${body}.${base64url(signature)}`;
}

export async function signRefreshToken(payload: { sub: string; jti: string }): Promise<string> {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, type: "refresh", iat: now, exp: now + REFRESH_TOKEN_MAX_AGE }));
  const signature = crypto.createHmac("sha256", getSecret("refresh")).update(`${header}.${body}`).digest();
  return `${header}.${body}.${base64url(signature)}`;
}

export async function signGateToken(payload: { sub: string; role: string }): Promise<string> {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, type: "gate", iat: now, exp: now + REFRESH_TOKEN_MAX_AGE }));
  const signature = crypto.createHmac("sha256", getSecret("access")).update(`${header}.${body}`).digest();
  return `${header}.${body}.${base64url(signature)}`;
}

function verify(token: string, secret: string): any {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  const [header, body, sig] = parts;
  const expectedSig = base64url(crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest());
  if (expectedSig !== sig) throw new Error("Invalid signature");
  const payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("Token expired");
  return payload;
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const payload = verify(token, getSecret("access"));
  return payload as AccessTokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const payload = verify(token, getSecret("refresh"));
  return payload as RefreshTokenPayload;
}
