import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, FlagWavy } from "@dub/ui/src/icons";
import { cn, COUNTRIES } from "@dub/utils";
import { useMemo } from "react";
import { StatusBadges } from "./partner-table";

export function usePartnerFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: Object.entries(StatusBadges).map(([value, { label }]) => {
          const Icon = StatusBadges[value].icon;
          return {
            value,
            label,
            icon: (
              <Icon className={cn("size-4", StatusBadges[value].className)} />
            ),
          };
        }),
      },
      {
        key: "country",
        icon: FlagWavy,
        label: "Location",
        getOptionIcon: (value) => (
          <img
            alt={value}
            src={`https://flag.vercel.app/m/${value}.svg`}
            className="h-2.5 w-4"
          />
        ),
        getOptionLabel: (value) => COUNTRIES[value],
        options: Object.entries(COUNTRIES).map(([value, label]) => ({
          value,
          label,
        })),
      },
    ],
    [],
  );

  const activeFilters = useMemo(() => {
    const { status, country } = searchParamsObj;
    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(country ? [{ key: "country", value: country }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
    });

  const onRemove = (key: string, value: any) =>
    queryParams({
      del: [key, "page"],
    });

  const onRemoveAll = () =>
    queryParams({
      del: ["status", "country", "search"],
    });

  const searchQuery = useMemo(
    () =>
      new URLSearchParams({
        ...Object.fromEntries(
          activeFilters.map(({ key, value }) => [key, value]),
        ),
        ...(searchParamsObj.search && { search: searchParamsObj.search }),
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
  };
}
