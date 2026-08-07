"use client";

import {
  HTTP_MUTATION_METHODS,
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

  const { data: statusCounts } = useApiLogsCount({
    groupBy: "statusCode",
    enabled:
      selectedFilter === "statusCode" || searchParamsObj.statusCode
        ? true
        : false,
  });

  const { data: methodCounts } = useApiLogsCount({
    groupBy: "method",
    enabled:
      selectedFilter === "method" || searchParamsObj.method ? true : false,
  });

  const filters = useMemo(
    () => [
      {
        key: "statusCode",
        icon: CircleCheck,
        label: "Status",
        options: statusCounts
          ? HTTP_STATUS_CODES.map(({ value, label }) => {
              const icon = createElement(CircleCheck, {
                className: cn(
                  "h-4 w-4",
                  value >= 200 && value < 300
                    ? "text-green-600"
                    : "text-red-600",
                ),
              });

              const count = statusCounts.find(
                (row) => row.statusCode === value,
              )?.count;

              return {
                value,
                label,
                icon,
                right: nFormatter(count || 0, { full: true }),
              };
            })
          : undefined,
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
        options: methodCounts
          ? HTTP_MUTATION_METHODS.map((m) => {
              const count = methodCounts.find((row) => row.method === m)?.count;

              return {
                value: m,
                label: m,
                right: nFormatter(count || 0, { full: true }),
              };
            })
          : undefined,
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
    [tokens, routePatterns, statusCounts, methodCounts],
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
        del: [
          "method",
          "statusCode",
          "routePattern",
          "tokenId",
          "requestType",
          "start",
          "end",
          "interval",
        ],
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
