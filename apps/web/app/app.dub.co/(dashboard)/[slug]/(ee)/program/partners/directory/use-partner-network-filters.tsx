import { industryInterests } from "@/lib/partners/partner-profile";
import usePartnerNetworkPartnersCount from "@/lib/swr/use-partner-network-partners-count";
import { useRouterStuff } from "@dub/ui";
import { FlagWavy, Heart } from "@dub/ui/icons";
import { COUNTRIES, nFormatter } from "@dub/utils";
import { useMemo } from "react";

export function usePartnerNetworkFilters({
  status,
}: {
  status: "discover" | "invited" | "recruited";
}) {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const { data: countriesCount } = usePartnerNetworkPartnersCount<
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
          industryInterests?.map(({ id, icon: Icon, label }) => {
            return {
              value: id,
              label,
              icon: <Icon className="size-4" />,
            };
          }) ?? [],
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

  const selectedIndustryInterests = useMemo(
    () => searchParamsObj.industryInterests?.split(",")?.filter(Boolean) ?? [],
    [searchParamsObj.industryInterests],
  );

  const activeFilters = useMemo(() => {
    const { status, country } = searchParamsObj;

    return [
      // Handle tagIds special case
      ...(selectedIndustryInterests.length > 0
        ? [{ key: "industryInterests", value: selectedIndustryInterests }]
        : []),
      ...(country ? [{ key: "country", value: country }] : []),
    ];
  }, [searchParamsObj, selectedIndustryInterests]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set:
        key === "industryInterests"
          ? {
              [key]: selectedIndustryInterests.concat(value).join(","),
            }
          : {
              [key]: value,
            },
      del: "page",
    });

  const onRemove = (key: string, value: any) => {
    if (
      key === "industryInterests" &&
      !(
        selectedIndustryInterests.length === 1 &&
        selectedIndustryInterests[0] === value
      )
    ) {
      queryParams({
        set: {
          industryInterests: selectedIndustryInterests
            .filter((id) => id !== value)
            .join(","),
        },
        del: "page",
      });
    } else {
      queryParams({
        del: [key, "page"],
      });
    }
  };

  const onRemoveAll = () =>
    queryParams({
      del: ["industryInterests", "country"],
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
