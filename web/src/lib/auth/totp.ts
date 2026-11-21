import * as OTPAuth from "otpauth";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "access-secret-key-for-testing";
  return crypto.scryptSync(secret, "ligera-salt", 32);
}

export function encryptSecret(secret: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(encrypted: string): string {
  const key = getKey();
  const data = Buffer.from(encrypted, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const text = data.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
  return decrypted.toString("utf8");
}

export function generateSecret(): { secret: string; uri: string } {
  const totp = new OTPAuth.TOTP({
    issuer: "Ligera",
    label: "admin",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });
  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

export function verifyTotp(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  } catch (error) {
    return false;
  }
}
