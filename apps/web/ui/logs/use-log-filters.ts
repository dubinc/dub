"use client";

import {
  HTTP_METHODS,
  HTTP_STATUS_CODES,
  LOGGED_PATH_PREFIXES,
} from "@/lib/api-logs/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import { TokenProps } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import {
  ArrowsOppositeDirectionX,
  CircleCheck,
  Globe,
  Key,
} from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
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

  const filters = useMemo(
    () => [
      {
        key: "path",
        icon: Globe,
        label: "Endpoint",
        options: LOGGED_PATH_PREFIXES.map((p) => ({
          value: p,
          label: p,
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
        key: "statusCode",
        icon: CircleCheck,
        label: "Status",
        options: HTTP_STATUS_CODES.map(({ value, label }) => ({
          value,
          label,
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
    [tokens],
  );

  const activeFilters = useMemo(() => {
    const { method, statusCode, path, tokenId } = searchParamsObj;

    return [
      ...(method ? [{ key: "method", value: method }] : []),
      ...(statusCode ? [{ key: "statusCode", value: statusCode }] : []),
      ...(path ? [{ key: "path", value: path }] : []),
      ...(tokenId ? [{ key: "tokenId", value: tokenId }] : []),
    ];
  }, [searchParamsObj]);

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
        del: ["method", "statusCode", "path", "tokenId"],
      }),
    [queryParams],
  );

  const searchQuery = useMemo(
    () =>
      new URLSearchParams({
        ...Object.fromEntries(
          activeFilters.map(({ key, value }) => [key, value]),
        ),
        workspaceId: workspaceId || "",
      }).toString(),
    [activeFilters, workspaceId],
  );

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
