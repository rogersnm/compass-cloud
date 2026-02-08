import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey } from "@/lib/auth/api-keys";

describe("api-keys", () => {
  it("generates key with correct format", () => {
    const { key, hash, prefix } = generateApiKey();
    expect(key.startsWith("cpk_")).toBe(true);
    expect(hash.length).toBe(64); // SHA-256 hex
    expect(prefix.length).toBe(12);
    expect(key.startsWith(prefix)).toBe(true);
  });

  it("produces unique keys over 100 iterations", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const { key } = generateApiKey();
      keys.add(key);
    }
    expect(keys.size).toBe(100);
  });

  it("hash of key matches generated hash", () => {
    const { key, hash } = generateApiKey();
    expect(hashApiKey(key)).toBe(hash);
  });

  it("different keys produce different hashes", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.hash).not.toBe(b.hash);
  });
});
