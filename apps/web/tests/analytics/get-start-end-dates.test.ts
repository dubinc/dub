import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { describe, expect, it } from "vitest";

describe("getStartEndDates", () => {
  it("picks monthly periods for a one-year range", () => {
    const { startDate, endDate, granularity } = getStartEndDates({
      start: "2025-10-08",
      end: "2026-10-08",
      timezone: "UTC",
    });

    expect(granularity).toEqual("month");
    expect(new Date(startDate.getTime()).toISOString()).toEqual(
      "2025-10-08T00:00:00.000Z",
    );
    expect(new Date(endDate.getTime()).toISOString()).toEqual(
      "2026-10-08T23:59:59.999Z",
    );
  });

  it("swaps a reversed range before it picks the periods and the day boundaries", () => {
    const { startDate, endDate, granularity } = getStartEndDates({
      start: "2026-10-08",
      end: "2025-10-08",
      timezone: "UTC",
    });

    expect(granularity).toEqual("month");
    expect(new Date(startDate.getTime()).toISOString()).toEqual(
      "2025-10-08T00:00:00.000Z",
    );
    expect(new Date(endDate.getTime()).toISOString()).toEqual(
      "2026-10-08T23:59:59.999Z",
    );
  });

  it("picks hourly periods for a range of two days or less", () => {
    const { granularity } = getStartEndDates({
      start: "2026-10-07",
      end: "2026-10-08",
      timezone: "UTC",
    });

    expect(granularity).toEqual("hour");
  });

  it("picks daily periods for a range between three and 90 days", () => {
    const { granularity } = getStartEndDates({
      start: "2026-09-08",
      end: "2026-10-08",
      timezone: "UTC",
    });

    expect(granularity).toEqual("day");
  });
});
