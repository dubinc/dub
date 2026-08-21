import { formatUTCDateTimeClickhouse } from "@/lib/analytics/utils/format-utc-datetime-clickhouse";
import { sanitizeTimezone } from "@/lib/analytics/utils/sanitize-timezone";
import { ApiLogsGranularity, PlanProps } from "@/lib/types";
import { tz, TZDate } from "@date-fns/tz";
import { differenceInDays, endOfToday, subDays } from "date-fns";
import { getStartEndDates } from "../analytics/utils/get-start-end-dates";
import { API_LOG_RETENTION_DAYS, DEFAULT_RETENTION_DAYS } from "./constants";

export function getApiLogsDateRange({
  plan,
  start,
  end,
  interval,
  timezone,
  exactRange,
}: {
  plan: PlanProps;
  start?: string | Date | null;
  end?: string | Date | null;
  interval?: string;
  timezone?: string;
  exactRange?: boolean;
}): {
  startDate: string;
  endDate: string;
  granularity: ApiLogsGranularity;
} {
  const tzName = sanitizeTimezone(timezone);
  const retentionDays = API_LOG_RETENTION_DAYS[plan] ?? DEFAULT_RETENTION_DAYS;
  const retentionBoundary = subDays(new Date(), retentionDays);

  // Histogram bar clicks pass exactRange so we keep the bucket's real start/end
  // (e.g. a single hour). getStartEndDates otherwise snaps custom ranges to
  // startOfDay/endOfDay, which would expand an hour click to the whole day.
  if (exactRange && start && end) {
    let startDate = new Date(start);
    let endDate = new Date(end);

    if (startDate > endDate) {
      [startDate, endDate] = [endDate, startDate];
    }

    const { normalizedStart, normalizedEnd } = clampToRetention({
      startDate,
      endDate,
      retentionBoundary,
    });

    return {
      startDate: formatUTCDateTimeClickhouse(normalizedStart),
      endDate: formatUTCDateTimeClickhouse(normalizedEnd),
      granularity: granularityFromRange({
        startDate: normalizedStart,
        endDate: normalizedEnd,
        timezone: tzName,
      }),
    };
  }

  if (interval === "60d") {
    const startDate = subDays(new TZDate(Date.now(), tzName), 60);
    const endDate = endOfToday({ in: tz(tzName) });

    const { normalizedStart, normalizedEnd } = clampToRetention({
      startDate,
      endDate,
      retentionBoundary,
    });

    return {
      startDate: formatUTCDateTimeClickhouse(normalizedStart),
      endDate: formatUTCDateTimeClickhouse(normalizedEnd),
      granularity: "day",
    };
  }

  if (interval || (start && end)) {
    const {
      startDate,
      endDate,
      granularity: resolvedGranularity,
    } = getStartEndDates({
      interval,
      start,
      end,
      timezone: tzName,
    });

    const { normalizedStart, normalizedEnd } = clampToRetention({
      startDate,
      endDate,
      retentionBoundary,
    });

    const granularity: ApiLogsGranularity =
      resolvedGranularity === "hour" ? "hour" : "day";

    return {
      startDate: formatUTCDateTimeClickhouse(normalizedStart),
      endDate: formatUTCDateTimeClickhouse(normalizedEnd),
      granularity,
    };
  }

  return {
    startDate: formatUTCDateTimeClickhouse(retentionBoundary),
    endDate: formatUTCDateTimeClickhouse(new Date()),
    granularity: "day",
  };
}

function clampToRetention({
  startDate,
  endDate,
  retentionBoundary,
}: {
  startDate: Date;
  endDate: Date;
  retentionBoundary: Date;
}) {
  const clampedStart =
    startDate < retentionBoundary ? retentionBoundary : startDate;
  const clampedEnd = endDate < retentionBoundary ? retentionBoundary : endDate;

  return {
    normalizedStart: clampedStart <= clampedEnd ? clampedStart : clampedEnd,
    normalizedEnd: clampedStart <= clampedEnd ? clampedEnd : clampedStart,
  };
}

const HOUR_MS = 60 * 60 * 1000;

function granularityFromRange({
  startDate,
  endDate,
  timezone,
}: {
  startDate: Date;
  endDate: Date;
  timezone: string;
}): ApiLogsGranularity {
  const durationMs = endDate.getTime() - startDate.getTime();

  if (durationMs <= 2 * HOUR_MS) {
    return "minute";
  }

  const daysDifference = differenceInDays(endDate, startDate, {
    in: tz(timezone),
  });

  return daysDifference <= 2 ? "hour" : "day";
}
