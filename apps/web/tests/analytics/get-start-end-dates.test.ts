import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { describe, expect, it } from "vitest";

describe("getStartEndDates", () => {
  describe("preserveTime: false (default)", () => {
    it("floors a custom start to the start of the day", () => {
      const start = "2026-07-27T16:58:00.000Z";
      const end = "2026-07-27T16:59:30.000Z";

      const { startDate, endDate } = getStartEndDates({
        start,
        end,
        timezone: "UTC",
      });

      expect(startDate.getTime()).toBe(
        new Date("2026-07-27T00:00:00.000Z").getTime(),
      );
      expect(endDate.getTime()).toBe(
        new Date("2026-07-27T23:59:59.999Z").getTime(),
      );
    });

    it("defaults a missing end to the end of today", () => {
      const start = "2026-07-27T16:58:00.000Z";

      const { endDate } = getStartEndDates({ start, timezone: "UTC" });

      expect(endDate.getUTCHours()).toBe(23);
      expect(endDate.getUTCMinutes()).toBe(59);
      expect(endDate.getUTCSeconds()).toBe(59);
    });

    it("still selects hour granularity for short day-bucketed ranges", () => {
      const start = "2026-07-27T16:58:00.000Z";
      const end = "2026-07-27T16:59:30.000Z";

      const { granularity } = getStartEndDates({
        start,
        end,
        timezone: "UTC",
      });

      expect(granularity).toBe("hour");
    });
  });

  describe("preserveTime: true", () => {
    it("preserves the exact start and end timestamps", () => {
      const start = "2026-07-27T16:58:00.000Z";
      const end = "2026-07-27T16:59:30.000Z";

      const { startDate, endDate } = getStartEndDates({
        start,
        end,
        timezone: "UTC",
        preserveTime: true,
      });

      expect(startDate.getTime()).toBe(new Date(start).getTime());
      expect(endDate.getTime()).toBe(new Date(end).getTime());
    });

    it("does not widen a sub-minute window to a full day", () => {
      const now = new Date();
      const start = new Date(now.getTime() - 90 * 1000);

      const { startDate, endDate } = getStartEndDates({
        start,
        end: now,
        preserveTime: true,
      });

      expect(endDate.getTime() - startDate.getTime()).toBe(90 * 1000);
    });

    it("defaults a missing end to the exact current time, not end of day", () => {
      const start = "2026-07-27T16:58:00.000Z";
      const before = Date.now();

      const { endDate } = getStartEndDates({ start, preserveTime: true });

      const after = Date.now();

      expect(endDate.getTime()).toBeGreaterThanOrEqual(before);
      expect(endDate.getTime()).toBeLessThanOrEqual(after);
    });

    it("still swaps start and end if start is after end", () => {
      const earlier = "2026-07-27T10:00:00.000Z";
      const later = "2026-07-27T12:00:00.000Z";

      const { startDate, endDate } = getStartEndDates({
        start: later,
        end: earlier,
        timezone: "UTC",
        preserveTime: true,
      });

      expect(startDate.getTime()).toBe(new Date(earlier).getTime());
      expect(endDate.getTime()).toBe(new Date(later).getTime());
    });
  });
});
