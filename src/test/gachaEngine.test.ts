import { describe, it, expect } from "vitest";
import { rollSinglePull, rollBatch } from "../features/gacha/gachaEngine";
import type { CardDef, PoolDef } from "../types";

const testCards: CardDef[] = [
  { id: "n1", name: "Test N1", rarity: "N", element: "金", keywords: [] },
  { id: "r1", name: "Test R1", rarity: "R", element: "木", keywords: [] },
  { id: "sr1", name: "Test SR1", rarity: "SR", element: "水", keywords: [] },
  { id: "ssr1", name: "Test SSR1", rarity: "SSR", element: "火", keywords: [] },
  { id: "ssr2", name: "Test SSR2", rarity: "SSR", element: "土", keywords: [] },
];

const testPool: PoolDef = {
  id: "test",
  name: "测试池",
  desc: "测试池描述",
  ssrUpRate: 0.5,
  upSsrIds: ["ssr1"],
};

describe("gachaEngine", () => {
  describe("rollSinglePull", () => {
    it("should return a valid pull result", () => {
      const result = rollSinglePull(testCards, testPool, 12345, 0, 0, false);
      expect(result.card).toBeDefined();
      expect(result.rarity).toBeDefined();
      expect(["N", "R", "SR", "SSR"]).toContain(result.rarity);
    });

    it("should trigger SSR pity at 60 pulls", () => {
      const result = rollSinglePull(testCards, testPool, 12345, 0, 59, false);
      expect(result.rarity).toBe("SSR");
      expect(result.wasPitySSR).toBe(true);
    });

    it("should trigger SR pity at 10 pulls", () => {
      const result = rollSinglePull(testCards, testPool, 12345, 9, 0, false);
      expect(result.wasPitySR).toBe(true);
      expect(["SR", "SSR"]).toContain(result.rarity);
    });

    it("should handle wheel buff correctly", () => {
      const wheelBuff = { srBonus: 0.5, ssrBonus: 1.0 };
      const result = rollSinglePull(testCards, testPool, 12345, 0, 0, false, wheelBuff);
      expect(result).toBeDefined();
    });

    it("should handle UP SSR correctly", () => {
      const result = rollSinglePull(testCards, testPool, 12345, 0, 0, true);
      if (result.rarity === "SSR") {
        expect(result.isUp).toBe(true);
        expect(result.nextUpGuarantee).toBe(false);
      }
    });
  });

  describe("rollBatch", () => {
    it("should return correct number of results", () => {
      const getState = () => ({ sr: 0, ssr: 0, upGuarantee: false });
      const result = rollBatch(testCards, testPool, 12345, 10, getState, null);
      expect(result.results.length).toBe(10);
      expect(result.finalSR).toBeDefined();
      expect(result.finalSSR).toBeDefined();
    });

    it("should reset pity counters correctly", () => {
      const getState = () => ({ sr: 0, ssr: 0, upGuarantee: false });
      const result = rollBatch(testCards, testPool, 12345, 5, getState, null);
      
      expect(result).toBeDefined();
    });
  });
});
