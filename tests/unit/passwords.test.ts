import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "@/lib/auth/passwords";

describe("passwords", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("mysecretpassword");
    expect(hash).not.toBe("mysecretpassword");
    expect(hash.startsWith("$2")).toBe(true);

    const valid = await comparePassword("mysecretpassword", hash);
    expect(valid).toBe(true);

    const invalid = await comparePassword("wrongpassword", hash);
    expect(invalid).toBe(false);
  });

  it("produces different hashes for same input", async () => {
    const hash1 = await hashPassword("test");
    const hash2 = await hashPassword("test");
    expect(hash1).not.toBe(hash2);
  });
});
