import { getReportingPeriod } from "@/lib/jobs/handlers/send-partner-program-summary-job";
import { describe, expect, it } from "vitest";

describe("getReportingPeriod", () => {
  it("returns UTC month bounds for a mid-year month", () => {
    const period = getReportingPeriod("2026-08");

    expect(period.month).toBe("August 2026");
    expect(period.currentMonth.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(period.previousMonth.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(period.start).toBe("2026-08-01T00:00:00.000Z");
    expect(period.end).toBe("2026-08-31T23:59:59.999Z");
  });

  it("rolls the previous month into the prior year for January", () => {
    const period = getReportingPeriod("2026-01");

    expect(period.month).toBe("January 2026");
    expect(period.currentMonth.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(period.previousMonth.toISOString()).toBe("2025-12-01T00:00:00.000Z");
    expect(period.start).toBe("2026-01-01T00:00:00.000Z");
    expect(period.end).toBe("2026-01-31T23:59:59.999Z");
  });

  it("uses the last day of February for a non-leap year", () => {
    const period = getReportingPeriod("2025-02");

    expect(period.month).toBe("February 2025");
    expect(period.start).toBe("2025-02-01T00:00:00.000Z");
    expect(period.end).toBe("2025-02-28T23:59:59.999Z");
  });

  it("uses the last day of February for a leap year", () => {
    const period = getReportingPeriod("2024-02");

    expect(period.month).toBe("February 2024");
    expect(period.start).toBe("2024-02-01T00:00:00.000Z");
    expect(period.end).toBe("2024-02-29T23:59:59.999Z");
  });
});
