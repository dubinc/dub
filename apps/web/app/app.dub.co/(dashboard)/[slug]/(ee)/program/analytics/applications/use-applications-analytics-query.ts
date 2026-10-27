"use client";

import { ApplicationEventStages } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { useMemo } from "react";

export type ApplicationsView = "timeseries" | "funnel";

function parseStage(raw: unknown): ApplicationEventStages {
  if (raw === "started") return "started";
  if (raw === "submitted") return "submitted";
  if (raw === "approved") return "approved";
  return "visited";
}

function parseView(raw: unknown): ApplicationsView {
  return raw === "timeseries" ? "timeseries" : "funnel";
}

export function useApplicationsAnalyticsQuery() {
  const { searchParamsObj } = useRouterStuff();

  const stage = useMemo<ApplicationEventStages>(
    () => parseStage(searchParamsObj.applicationEvent),
    [searchParamsObj.applicationEvent],
  );

  const view = useMemo<ApplicationsView>(
    () => parseView(searchParamsObj.view),
    [searchParamsObj.view],
  );

  return {
    stage,
    view,
  };
}
