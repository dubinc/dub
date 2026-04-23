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
    const raw = searchParamsObj.commissionStatus;
    if (raw === "pending" || raw === "processed" || raw === "paid") return raw;
    return undefined; // undefined = All (no status filter)
  }, [searchParamsObj.commissionStatus]);

  const queryString = useMemo(() => {
    const {
      commissionStatus: _commissionStatus,
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
      workspaceId: workspaceId!,
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
  }, [workspaceId, status, searchParamsObj]);

  return { queryString, status };
}
