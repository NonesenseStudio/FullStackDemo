import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { createError, setCookie, type H3Event } from "h3";

const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt);
  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, saltValue, keyValue, extra] =
    passwordHash.split("$");
  if (
    algorithm !== "scrypt" ||
    Number(cost) !== SCRYPT_COST ||
    Number(blockSize) !== SCRYPT_BLOCK_SIZE ||
    Number(parallelization) !== SCRYPT_PARALLELIZATION ||
    !saltValue ||
    !keyValue ||
    extra !== undefined
  ) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expectedKey = Buffer.from(keyValue, "base64url");
  if (salt.length !== SALT_LENGTH || expectedKey.length !== KEY_LENGTH) return false;

  const actualKey = await deriveKey(password, salt);
  return timingSafeEqual(actualKey, expectedKey);
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw createError({ statusCode: 500, statusMessage: "服务器认证密钥未正确配置" });
  }
  return secret;
}

export function assertAuthConfigured(): void {
  getAuthSecret();
}

export function createAuthToken(userId: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub: String(userId), iat: now, exp: now + TOKEN_LIFETIME_SECONDS }),
  ).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const signature = createHmac("sha256", getAuthSecret()).update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}

export function setAuthCookie(event: H3Event, token: string): void {
  setCookie(event, "token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_LIFETIME_SECONDS,
  });
}
