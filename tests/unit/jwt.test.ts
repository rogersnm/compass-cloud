import { describe, it, expect, beforeAll } from "vitest";
import { signAccessToken, signRefreshToken, verifyToken } from "@/lib/auth/jwt";

describe("jwt", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret-for-unit-tests";
  });

  it("signs and verifies an access token", () => {
    const token = signAccessToken({ userId: "user-123" });
    expect(typeof token).toBe("string");

    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("user-123");
  });

  it("signs and verifies a refresh token", () => {
    const token = signRefreshToken({ userId: "user-456" });
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("user-456");
  });

  it("returns null for invalid token", () => {
    const payload = verifyToken("invalid-token");
    expect(payload).toBeNull();
  });

  it("returns null for tampered token", () => {
    const token = signAccessToken({ userId: "user-123" });
    const tampered = token.slice(0, -5) + "XXXXX";
    const payload = verifyToken(tampered);
    expect(payload).toBeNull();
  });
});
