import { describe, it, expect } from "vitest";
import { createRng, pickWeighted, hashString } from "../lib/rng";

describe("RNG", () => {
  describe("hashString", () => {
    it("should hash a string consistently", () => {
      const hash1 = hashString("test");
      const hash2 = hashString("test");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different strings", () => {
      const hash1 = hashString("test1");
      const hash2 = hashString("test2");
      expect(hash1).not.toBe(hash2);
    });

    it("should return a positive integer", () => {
      const hash = hashString("test");
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
    });
  });

  describe("createRng", () => {
    it("should produce deterministic sequence with same seed", () => {
      const rng1 = createRng(12345);
      const rng2 = createRng(12345);
      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
    });

    it("should produce different values with different seeds", () => {
      const rng1 = createRng(12345);
      const rng2 = createRng(54321);
      const values1 = [rng1(), rng1(), rng1()];
      const values2 = [rng2(), rng2(), rng2()];
      expect(values1).not.toEqual(values2);
    });

    it("should produce values between 0 (inclusive) and 1 (exclusive)", () => {
      const rng = createRng(12345);
      for (let i = 0; i < 100; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe("pickWeighted", () => {
    it("should pick an item from the list", () => {
      const items = [
        { item: "a", weight: 1 },
        { item: "b", weight: 1 },
      ];
      const rng = createRng(12345);
      const result = pickWeighted(items, rng);
      expect(["a", "b"]).toContain(result);
    });

    it("should respect weights", () => {
      const items = [
        { item: "a", weight: 0 },
        { item: "b", weight: 100 },
      ];
      const rng = createRng(12345);
      const result = pickWeighted(items, rng);
      expect(result).toBe("b");
    });

    it("should return the last item if rng produces value above total", () => {
      const items = [
        { item: "a", weight: 1 },
        { item: "b", weight: 1 },
      ];
      const rng = () => 1.0;
      const result = pickWeighted(items, rng);
      expect(result).toBe("b");
    });
  });
});
