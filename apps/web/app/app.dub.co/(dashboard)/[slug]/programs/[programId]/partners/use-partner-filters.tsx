import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, FlagWavy } from "@dub/ui/src/icons";
import { cn, COUNTRIES, nFormatter } from "@dub/utils";
import { useMemo } from "react";
import { PartnerStatusBadges } from "./partner-table";

export function usePartnerFilters(extraSearchParams: Record<string, string>) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();
  const { partnersCount } = usePartnersCount();

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: Object.entries(PartnerStatusBadges).map(
          ([value, { label }]) => {
            const Icon = PartnerStatusBadges[value].icon;
            return {
              value,
              label,
              icon: (
                <Icon
                  className={cn(
                    PartnerStatusBadges[value].className,
                    "size-4 bg-transparent",
                  )}
                />
              ),
              right: nFormatter(partnersCount?.[value] || 0, { full: true }),
            };
          },
        ),
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
    [partnersCount],
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
        ...extraSearchParams,
      }).toString(),
    [activeFilters, workspaceId, extraSearchParams],
  );

  const isFiltered = activeFilters.length > 0 || searchParamsObj.search;

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    isFiltered,
  };
}
