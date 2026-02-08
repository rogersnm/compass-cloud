import crypto from "crypto";

const CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const HASH_LEN = 5;

export type EntityType = "project" | "task" | "document";

export function generateHash(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(HASH_LEN));
  let result = "";
  for (let i = 0; i < HASH_LEN; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}

export function generateKey(name: string): string {
  const buf: string[] = [];
  for (const ch of name) {
    if (/[a-zA-Z]/.test(ch)) {
      buf.push(ch.toUpperCase());
    }
    if (buf.length === 4) break;
  }
  if (buf.length < 2) {
    throw new Error(
      `cannot auto-generate key from "${name}": need at least 2 alpha characters`
    );
  }
  return buf.join("");
}

export function validateKey(key: string): void {
  if (key.length < 2 || key.length > 5) {
    throw new Error(`invalid key "${key}": must be 2-5 characters`);
  }
  if (!/^[A-Z0-9]+$/.test(key)) {
    throw new Error(
      `invalid key "${key}": must be uppercase alphanumeric (no dashes)`
    );
  }
}

export function newTaskId(projectKey: string): string {
  validateKey(projectKey);
  return `${projectKey}-T${generateHash()}`;
}

export function newDocId(projectKey: string): string {
  validateKey(projectKey);
  return `${projectKey}-D${generateHash()}`;
}

export function parseDisplayId(
  id: string
): { key: string; type: EntityType; hash: string } {
  const idx = id.lastIndexOf("-");
  if (idx < 0) {
    validateKey(id);
    return { key: id, type: "project", hash: "" };
  }

  const key = id.slice(0, idx);
  const suffix = id.slice(idx + 1);

  validateKey(key);

  if (suffix.length !== HASH_LEN + 1) {
    throw new Error(
      `invalid id "${id}": suffix must be ${HASH_LEN + 1} chars`
    );
  }

  const typeChar = suffix[0];
  const hash = suffix.slice(1);

  let type: EntityType;
  if (typeChar === "T") {
    type = "task";
  } else if (typeChar === "D") {
    type = "document";
  } else {
    throw new Error(
      `invalid id "${id}": unknown type indicator "${typeChar}"`
    );
  }

  for (const c of hash) {
    if (!CHARSET.includes(c)) {
      throw new Error(
        `invalid id "${id}": invalid character "${c}" in hash`
      );
    }
  }

  return { key, type, hash };
}
