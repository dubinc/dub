"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import { useMemo } from "react";
import { CommissionStatusFilter } from "./commissions-status-selector";

export function useCommissionsAnalyticsQuery() {
  const { id: workspaceId } = useWorkspace();
  const { searchParamsObj } = useRouterStuff();

  const status = useMemo<CommissionStatusFilter>(() => {
    const raw = searchParamsObj.status;
    if (raw === "pending" || raw === "processed" || raw === "paid") return raw;
    return undefined; // All (default)
  }, [searchParamsObj.status]);

  const unit = useMemo<"earnings" | "count">(() => {
    return searchParamsObj.commissionUnit === "count" ? "count" : "earnings";
  }, [searchParamsObj.commissionUnit]);

  const queryString = useMemo(() => {
    if (!workspaceId) return "";

    const {
      status: _status, // excluded — added explicitly below via validated `status` variable
      commissionUnit: _commissionUnit,
      pageTab: _pageTab,
      event: _event,
      saleUnit: _saleUnit,
      view: _view,
      interval,
      start,
      end,
      partnerId,
      groupId,
      type,
    } = searchParamsObj;

    const params = new URLSearchParams({
      workspaceId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    if (status) params.set("status", status);

    if (start && end) {
      params.set("start", start);
      params.set("end", end);
    } else {
      params.set("interval", interval ?? DUB_PARTNERS_ANALYTICS_INTERVAL);
    }

    if (partnerId) params.set("partnerId", partnerId);
    if (groupId) params.set("groupId", groupId);
    if (type) params.set("type", type);

    return params.toString();
  }, [workspaceId, status, unit, searchParamsObj]);

  const { interval, start, end } = searchParamsObj;
  const resolvedInterval =
    start && end ? undefined : interval ?? DUB_PARTNERS_ANALYTICS_INTERVAL;
  const resolvedStart = start ? new Date(start) : undefined;
  const resolvedEnd = end ? new Date(end) : undefined;

  return {
    queryString,
    status,
    unit,
    interval: resolvedInterval,
    start: resolvedStart,
    end: resolvedEnd,
  };
}
