"use client";

import { LOGGED_PATH_PREFIXES } from "@/lib/api-logs/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import { TokenProps } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import { Code, Globe, Key, Receipt2 } from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { useDebounce } from "use-debounce";

const METHODS = ["POST", "PATCH", "PUT", "DELETE"] as const;

const STATUS_CODES = [
  { value: "200", label: "200 OK" },
  { value: "201", label: "201 Created" },
  { value: "400", label: "400 Bad Request" },
  { value: "401", label: "401 Unauthorized" },
  { value: "403", label: "403 Forbidden" },
  { value: "404", label: "404 Not Found" },
  { value: "409", label: "409 Conflict" },
  { value: "422", label: "422 Unprocessable" },
  { value: "429", label: "429 Rate Limited" },
  { value: "500", label: "500 Server Error" },
];

export function useLogFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { data: tokens } = useSWR<TokenProps[]>(
    selectedFilter === "tokenId"
      ? `/api/tokens?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const filters = useMemo(
    () => [
      {
        key: "method",
        icon: Code,
        label: "Method",
        options: METHODS.map((m) => ({
          value: m,
          label: m,
        })),
      },
      {
        key: "statusCode",
        icon: Receipt2,
        label: "Status",
        options: STATUS_CODES.map(({ value, label }) => ({
          value,
          label,
        })),
      },
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
