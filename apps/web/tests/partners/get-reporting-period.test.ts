import { getReportingPeriod } from "@/lib/jobs/handlers/send-partner-program-summary-job";
import { endOfMonth, format } from "date-fns";
import { describe, expect, it } from "vitest";

describe("getReportingPeriod", () => {
  it("returns the reporting month label and bounds for a mid-year month", () => {
    const period = getReportingPeriod("2026-08");

    expect(period.month).toBe("August 2026");
    expect(format(period.currentMonth, "yyyy-MM")).toBe("2026-08");
    expect(format(period.previousMonth, "yyyy-MM")).toBe("2026-07");
    expect(period.start).toBe(period.currentMonth.toISOString());
    expect(period.end).toBe(endOfMonth(period.currentMonth).toISOString());
  });

  it("rolls the previous month into the prior year for January", () => {
    const period = getReportingPeriod("2026-01");

    expect(period.month).toBe("January 2026");
    expect(format(period.currentMonth, "yyyy-MM")).toBe("2026-01");
    expect(format(period.previousMonth, "yyyy-MM")).toBe("2025-12");
    expect(period.start).toBe(period.currentMonth.toISOString());
    expect(period.end).toBe(endOfMonth(period.currentMonth).toISOString());
  });

  it("uses the last day of February for a non-leap year", () => {
    const period = getReportingPeriod("2025-02");

    expect(period.month).toBe("February 2025");
    expect(format(period.currentMonth, "yyyy-MM-dd")).toBe("2025-02-01");
    expect(format(period.end, "yyyy-MM-dd")).toBe("2025-02-28");
  });

  it("uses the last day of February for a leap year", () => {
    const period = getReportingPeriod("2024-02");

    expect(period.month).toBe("February 2024");
    expect(format(period.currentMonth, "yyyy-MM-dd")).toBe("2024-02-01");
    expect(format(period.end, "yyyy-MM-dd")).toBe("2024-02-29");
  });
});
