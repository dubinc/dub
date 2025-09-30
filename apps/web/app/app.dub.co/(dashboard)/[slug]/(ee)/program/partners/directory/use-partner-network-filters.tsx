import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import { FlagWavy } from "@dub/ui/icons";
import { COUNTRIES, fetcher, nFormatter } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";

export function usePartnerNetworkFilters({
  status,
}: {
  status: "discover" | "invited" | "recruited";
}) {
  const { getQueryString, searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId, slug } = useWorkspace();

  const { data: countriesCount } = useSWR<
    | {
        country: string;
        _count: number;
      }[]
    | undefined
  >(
    `/api/network/partners/count${getQueryString({ workspaceId, status, groupBy: "country" }, { exclude: ["tab", "page"] })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const filters = useMemo(
    () => [
      // {
      //   key: "status",
      //   icon: CircleDotted,
      //   label: "Status",
      //   options:
      //     statusCount
      //       ?.filter(({ status }) => !["pending", "rejected"].includes(status))
      //       ?.map(({ status, _count }) => {
      //         const Icon = PartnerStatusBadges[status].icon;
      //         return {
      //           value: status,
      //           label: PartnerStatusBadges[status].label,
      //           icon: (
      //             <Icon
      //               className={cn(
      //                 PartnerStatusBadges[status].className,
      //                 "size-4 bg-transparent",
      //               )}
      //             />
      //           ),
      //           right: nFormatter(_count || 0, { full: true }),
      //         };
      //       }) ?? [],
      // },
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
        options:
          countriesCount
            ?.filter(({ country }) => COUNTRIES[country])
            .map(({ country, _count }) => ({
              value: country,
              label: COUNTRIES[country],
              right: nFormatter(_count, { full: true }),
            })) ?? [],
      },
    ],
    [countriesCount],
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
      del: ["status", "country"],
    });

  const isFiltered = activeFilters.length > 0 || searchParamsObj.search;

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  };
}
