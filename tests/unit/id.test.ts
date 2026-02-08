import { describe, it, expect } from "vitest";
import {
  generateHash,
  generateKey,
  validateKey,
  newTaskId,
  newDocId,
  parseDisplayId,
} from "@/lib/id/generate";

const CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

describe("ID generation", () => {
  describe("charset", () => {
    it("has no ambiguous characters (0, O, 1, I, L)", () => {
      expect(CHARSET).not.toContain("0");
      expect(CHARSET).not.toContain("O");
      expect(CHARSET).not.toContain("1");
      expect(CHARSET).not.toContain("I");
      expect(CHARSET).not.toContain("L");
    });

    it("has 31 unique characters", () => {
      expect(new Set(CHARSET).size).toBe(31);
      expect(CHARSET.length).toBe(31);
    });
  });

  describe("generateHash", () => {
    it("produces 5-char strings", () => {
      const hash = generateHash();
      expect(hash).toHaveLength(5);
    });

    it("uses only charset characters", () => {
      for (let i = 0; i < 100; i++) {
        const hash = generateHash();
        for (const c of hash) {
          expect(CHARSET).toContain(c);
        }
      }
    });

    it("produces unique values over 1000 iterations", () => {
      const seen = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        seen.add(generateHash());
      }
      // With 30^5 = 24.3M possibilities, 1000 should all be unique
      expect(seen.size).toBe(1000);
    });
  });

  describe("generateKey", () => {
    it("extracts first 4 alpha chars uppercased", () => {
      expect(generateKey("MyProject")).toBe("MYPR");
    });

    it("skips non-alpha characters", () => {
      expect(generateKey("a-b-c-d")).toBe("ABCD");
    });

    it("handles names with fewer than 4 alpha chars", () => {
      expect(generateKey("AB")).toBe("AB");
      expect(generateKey("abc")).toBe("ABC");
    });

    it("rejects names with fewer than 2 alpha chars", () => {
      expect(() => generateKey("1")).toThrow("need at least 2 alpha characters");
      expect(() => generateKey("")).toThrow("need at least 2 alpha characters");
      expect(() => generateKey("a")).toThrow("need at least 2 alpha characters");
      expect(() => generateKey("123")).toThrow("need at least 2 alpha characters");
    });
  });

  describe("validateKey", () => {
    it("accepts valid keys", () => {
      expect(() => validateKey("AB")).not.toThrow();
      expect(() => validateKey("ABCDE")).not.toThrow();
      expect(() => validateKey("AB2")).not.toThrow();
    });

    it("rejects short keys", () => {
      expect(() => validateKey("A")).toThrow("must be 2-5 characters");
    });

    it("rejects long keys", () => {
      expect(() => validateKey("ABCDEF")).toThrow("must be 2-5 characters");
    });

    it("rejects lowercase", () => {
      expect(() => validateKey("abc")).toThrow("must be uppercase alphanumeric");
    });

    it("rejects dashes", () => {
      expect(() => validateKey("A-B")).toThrow("must be uppercase alphanumeric");
    });
  });

  describe("newTaskId / newDocId", () => {
    it("generates task IDs in KEY-THASH format", () => {
      const id = newTaskId("AUTH");
      expect(id).toMatch(/^AUTH-T[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/);
    });

    it("generates doc IDs in KEY-DHASH format", () => {
      const id = newDocId("AUTH");
      expect(id).toMatch(/^AUTH-D[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/);
    });

    it("rejects invalid keys", () => {
      expect(() => newTaskId("x")).toThrow();
      expect(() => newDocId("x")).toThrow();
    });
  });

  describe("parseDisplayId", () => {
    it("parses task ID", () => {
      const result = parseDisplayId("AUTH-TABCDE");
      expect(result).toEqual({ key: "AUTH", type: "task", hash: "ABCDE" });
    });

    it("parses doc ID", () => {
      const result = parseDisplayId("AUTH-DABCDE");
      expect(result).toEqual({ key: "AUTH", type: "document", hash: "ABCDE" });
    });

    it("parses bare project key", () => {
      const result = parseDisplayId("AUTH");
      expect(result).toEqual({ key: "AUTH", type: "project", hash: "" });
    });

    it("roundtrips with newTaskId", () => {
      const id = newTaskId("PROJ");
      const parsed = parseDisplayId(id);
      expect(parsed.key).toBe("PROJ");
      expect(parsed.type).toBe("task");
      expect(parsed.hash).toHaveLength(5);
    });

    it("roundtrips with newDocId", () => {
      const id = newDocId("PROJ");
      const parsed = parseDisplayId(id);
      expect(parsed.key).toBe("PROJ");
      expect(parsed.type).toBe("document");
      expect(parsed.hash).toHaveLength(5);
    });

    it("rejects invalid type indicator", () => {
      expect(() => parseDisplayId("AUTH-XABCDE")).toThrow("unknown type indicator");
    });

    it("rejects wrong suffix length", () => {
      expect(() => parseDisplayId("AUTH-TAB")).toThrow("suffix must be 6 chars");
    });
  });
});
