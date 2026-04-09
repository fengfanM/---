import { describe, it, expect } from "vitest";
import { todayKey, weekKey } from "../store/gameStore";

describe("Utils", () => {
  describe("todayKey", () => {
    it("should return a valid date string in YYYY-MM-DD format", () => {
      const key = todayKey();
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return today's date", () => {
      const key = todayKey();
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      expect(key).toBe(`${year}-${month}-${day}`);
    });
  });

  describe("weekKey", () => {
    it("should return a valid date string in YYYY-MM-DD format", () => {
      const key = weekKey();
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return a Monday", () => {
      const key = weekKey();
      const [year, month, day] = key.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      expect(date.getDay()).toBe(1);
    });

    it("should be a past or current date", () => {
      const key = weekKey();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [year, month, day] = key.split("-").map(Number);
      const weekDate = new Date(year, month - 1, day);
      weekDate.setHours(0, 0, 0, 0);
      expect(weekDate.getTime()).toBeLessThanOrEqual(today.getTime());
    });
  });
});
