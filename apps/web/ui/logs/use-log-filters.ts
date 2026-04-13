"use client";

import {
  HTTP_METHODS,
  HTTP_STATUS_CODES,
  REQUEST_TYPES,
} from "@/lib/api-logs/constants";
import { useApiLogsCount } from "@/lib/swr/use-api-logs-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { TokenProps } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import {
  ArrowsOppositeDirectionX,
  CircleCheck,
  Globe,
  Key,
  Webhook,
} from "@dub/ui/icons";
import { cn, fetcher, nFormatter } from "@dub/utils";
import { createElement, useCallback, useMemo, useState } from "react";
import useSWR from "swr";

export function useLogFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const { data: tokens } = useSWR<TokenProps[]>(
    selectedFilter === "tokenId"
      ? `/api/tokens?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const activeFilters = useMemo(() => {
    const { method, statusCode, routePattern, tokenId, requestType } =
      searchParamsObj;

    return [
      ...(method ? [{ key: "method", value: method }] : []),
      ...(statusCode ? [{ key: "statusCode", value: statusCode }] : []),
      ...(routePattern ? [{ key: "routePattern", value: routePattern }] : []),
      ...(tokenId ? [{ key: "tokenId", value: tokenId }] : []),
      ...(requestType ? [{ key: "requestType", value: requestType }] : []),
    ];
  }, [searchParamsObj]);

  const { data: routePatterns } = useApiLogsCount({
    groupBy: "routePattern",
    enabled:
      selectedFilter === "routePattern" || searchParamsObj.routePattern
        ? true
        : false,
  });

  const filters = useMemo(
    () => [
      {
        key: "statusCode",
        icon: CircleCheck,
        label: "Status",
        options: HTTP_STATUS_CODES.map(({ value, label }) => {
          const icon = createElement(CircleCheck, {
            className: cn(
              "h-4 w-4",
              value >= 200 && value < 300 ? "text-green-600" : "text-red-600",
            ),
          });

          return {
            value,
            label,
            icon,
          };
        }),
      },
      {
        key: "routePattern",
        icon: Globe,
        label: "Endpoint",
        options: routePatterns?.map(({ routePattern, count }) => ({
          value: routePattern,
          label: routePattern,
          right: nFormatter(count, { full: true }),
        })),
      },
      {
        key: "method",
        icon: ArrowsOppositeDirectionX,
        label: "Method",
        options: HTTP_METHODS.map((m) => ({
          value: m,
          label: m,
        })),
      },
      {
        key: "tokenId",
        icon: Key,
        label: "API Key",
        options: (tokens || []).map(({ id, name, partialKey }) => ({
          value: id,
          label: `${name} (${partialKey})`,
        })),
      },
      {
        key: "requestType",
        icon: Webhook,
        label: "Request Type",
        options: REQUEST_TYPES.map(({ value, label }) => ({
          value,
          label,
        })),
      },
    ],
    [tokens, routePatterns],
  );

  const onSelect = useCallback(
    (key: string, value: any) =>
      queryParams({
        set: { [key]: value },
        del: "page",
      }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) =>
      queryParams({
        del: [key, "page"],
      }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["method", "statusCode", "routePattern", "tokenId", "requestType"],
      }),
    [queryParams],
  );

  const searchQuery = useMemo(() => {
    const params: Record<string, string> = {
      workspaceId: workspaceId || "",
      ...Object.fromEntries(
        activeFilters.map(({ key, value }) => [key, value]),
      ),
    };

    if (searchParamsObj.requestId) {
      params.requestId = searchParamsObj.requestId;
    }

    if (searchParamsObj.start) {
      params.start = searchParamsObj.start;
    }

    if (searchParamsObj.end) {
      params.end = searchParamsObj.end;
    }

    if (searchParamsObj.interval) {
      params.interval = searchParamsObj.interval;
    }

    return new URLSearchParams(params).toString();
  }, [
    activeFilters,
    workspaceId,
    searchParamsObj.requestId,
    searchParamsObj.start,
    searchParamsObj.end,
    searchParamsObj.interval,
  ]);

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    setSelectedFilter,
  };
}
