"use client";

import { HTTP_METHODS, HTTP_STATUS_CODES } from "@/lib/api-logs/constants";
import { useApiLogsCount } from "@/lib/swr/use-api-logs-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { ApiLogsCountByRoutePattern, TokenProps } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import {
  ArrowsOppositeDirectionX,
  CircleCheck,
  Globe,
  Key,
} from "@dub/ui/icons";
import { cn, fetcher } from "@dub/utils";
import { createElement, useCallback, useMemo, useState } from "react";
import useSWR from "swr";

export function useLogFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();

  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const { data: tokens } = useSWR<TokenProps[]>(
    selectedFilter === "tokenId"
      ? `/api/tokens?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const activeFilters = useMemo(() => {
    const { method, statusCode, routePattern, tokenId } = searchParamsObj;

    return [
      ...(method ? [{ key: "method", value: method }] : []),
      ...(statusCode ? [{ key: "statusCode", value: statusCode }] : []),
      ...(routePattern ? [{ key: "routePattern", value: routePattern }] : []),
      ...(tokenId ? [{ key: "tokenId", value: tokenId }] : []),
    ];
  }, [searchParamsObj]);

  const { data: routePatterns } = useApiLogsCount<ApiLogsCountByRoutePattern[]>(
    {
      groupBy: "routePattern",
      enabled: selectedFilter === "routePattern",
    },
  );

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
        shouldFilter: false,
        options:
          routePatterns?.map((r) => ({
            value: r.routePattern,
            label: r.routePattern,
          })) ?? null,
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
        shouldFilter: false,
        options:
          tokens?.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.partialKey})`,
          })) ?? null,
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
        del: ["method", "statusCode", "routePattern", "tokenId"],
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

    return new URLSearchParams(params).toString();
  }, [activeFilters, workspaceId, searchParamsObj.requestId]);

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    setSearch,
    setSelectedFilter,
  };
}
