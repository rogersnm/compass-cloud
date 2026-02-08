import { randomBytes } from "crypto";
import { hashToken } from "./tokens";

const API_KEY_PREFIX = "cpk_";

export function generateApiKey(): {
  key: string;
  hash: string;
  prefix: string;
} {
  const raw = randomBytes(32).toString("base64url");
  const key = `${API_KEY_PREFIX}${raw}`;
  const hash = hashToken(key);
  const prefix = key.slice(0, 12);
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return hashToken(key);
}
