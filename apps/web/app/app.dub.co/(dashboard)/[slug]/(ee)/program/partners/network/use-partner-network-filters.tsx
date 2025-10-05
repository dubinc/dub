import {
  industryInterests,
  preferredEarningStructures,
  salesChannels,
} from "@/lib/partners/partner-profile";
import useNetworkPartnersCount from "@/lib/swr/use-network-partners-count";
import { useRouterStuff } from "@dub/ui";
import { FlagWavy, Heart, InvoiceDollar, MoneyBills2 } from "@dub/ui/icons";
import { COUNTRIES, nFormatter } from "@dub/utils";
import { useCallback, useMemo } from "react";

export function usePartnerNetworkFilters({
  status,
}: {
  status: "discover" | "invited" | "recruited";
}) {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const { data: countriesCount } = useNetworkPartnersCount<
    | {
        country: string;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      status,
      groupBy: "country",
    },
    excludeParams: ["country"],
  });

  const filters = useMemo(
    () => [
      {
        key: "industryInterests",
        icon: Heart,
        label: "Industry interest",
        multiple: true,
        options:
          industryInterests?.map(({ id, icon: Icon, label }) => ({
            value: id,
            label,
            icon: <Icon className="size-4" />,
          })) ?? [],
      },
      {
        key: "salesChannels",
        icon: InvoiceDollar,
        label: "Sales channel",
        multiple: true,
        options:
          salesChannels?.map(({ id, label }) => ({
            value: id,
            label,
          })) ?? [],
      },
      {
        key: "preferredEarningStructures",
        icon: MoneyBills2,
        label: "Preferred earning structure",
        multiple: true,
        options:
          preferredEarningStructures?.map(({ id, label }) => ({
            value: id,
            label,
          })) ?? [],
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

  const multiFilters = useMemo(
    () => ({
      industryInterests:
        searchParamsObj.industryInterests?.split(",")?.filter(Boolean) ?? [],
      salesChannels:
        searchParamsObj.salesChannels?.split(",")?.filter(Boolean) ?? [],
      preferredEarningStructures:
        searchParamsObj.preferredEarningStructures
          ?.split(",")
          ?.filter(Boolean) ?? [],
    }),
    [searchParamsObj],
  );

  const activeFilters = useMemo(() => {
    const { country } = searchParamsObj;

    return [
      ...Object.entries(multiFilters)
        .map(([key, value]) => ({ key, value }))
        .filter(({ value }) => value.length > 0),

      ...(country ? [{ key: "country", value: country }] : []),
    ];
  }, [searchParamsObj, multiFilters]);

  const onSelect = useCallback(
    (key: string, value: any) =>
      queryParams({
        set: Object.keys(multiFilters).includes(key)
          ? {
              [key]: multiFilters[key].concat(value).join(","),
            }
          : {
              [key]: value,
            },
        del: "page",
      }),
    [queryParams, multiFilters],
  );

  const onRemove = useCallback(
    (key: string, value: any) => {
      if (
        Object.keys(multiFilters).includes(key) &&
        !(multiFilters[key].length === 1 && multiFilters[key][0] === value)
      ) {
        queryParams({
          set: {
            [key]: multiFilters[key].filter((id) => id !== value).join(","),
          },
          del: "page",
        });
      } else {
        queryParams({
          del: [key, "page"],
        });
      }
    },
    [queryParams, multiFilters],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: [...Object.keys(multiFilters), "country", "starred"],
      }),
    [queryParams],
  );

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
