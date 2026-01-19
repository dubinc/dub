import useNetworkPartnersCount from "@/lib/swr/use-network-partners-count";
import { PlatformType } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import {
  FlagWavy,
  Globe,
  Instagram,
  LinkedIn,
  Megaphone,
  ShieldCheck,
  TikTok,
  Twitter,
  YouTube,
} from "@dub/ui/icons";
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

  const { data: platformsCount } = useNetworkPartnersCount<
    | {
        platform: PlatformType;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      status,
      groupBy: "platform",
    },
    excludeParams: ["platform"],
  });

  const { data: subscribersCount } = useNetworkPartnersCount<
    | {
        subscribers: string;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      status,
      groupBy: "subscribers",
    },
    excludeParams: ["subscribers"],
  });

  const platformIcons: Record<PlatformType, typeof YouTube> = {
    youtube: YouTube,
    twitter: Twitter,
    instagram: Instagram,
    tiktok: TikTok,
    linkedin: LinkedIn,
    website: Globe,
  };

  const platformLabels: Record<PlatformType, string> = {
    youtube: "YouTube",
    twitter: "X/Twitter",
    instagram: "Instagram",
    tiktok: "TikTok",
    linkedin: "LinkedIn",
    website: "Website",
  };

  const subscriberLabels: Record<string, string> = {
    "<5000": "< 5,000",
    "5000-25000": "5,000 - 25,000",
    "25000-100000": "25,000 - 100,000",
    "100000+": "100,000+",
  };

  const filters = useMemo(
    () => [
      {
        key: "country",
        icon: FlagWavy,
        label: "Partner country",
        getOptionIcon: (value) => (
          <img
            alt={value}
            src={`https://hatscripts.github.io/circle-flags/flags/${value.toLowerCase()}.svg`}
            className="size-3.5 rounded-full"
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
      {
        key: "platform",
        icon: ShieldCheck,
        label: "Verified social platform",
        getOptionIcon: (value: PlatformType) => {
          const Icon = platformIcons[value] || YouTube;
          return <Icon className="size-4" />;
        },
        getOptionLabel: (value: PlatformType) => platformLabels[value] || value,
        options:
          platformsCount
            ?.filter(({ platform }) =>
              ["youtube", "twitter", "instagram", "tiktok"].includes(platform),
            )
            .map(({ platform, _count }) => ({
              value: platform,
              label: platformLabels[platform] || platform,
              right: nFormatter(_count, { full: true }),
            })) ?? [],
      },
      {
        key: "subscribers",
        icon: Megaphone,
        label: "Verified subscriber count",
        getOptionIcon: () => <Megaphone className="size-4" />,
        getOptionLabel: (value: string) => subscriberLabels[value] || value,
        options:
          subscribersCount?.map(({ subscribers, _count }) => ({
            value: subscribers,
            label: subscriberLabels[subscribers] || subscribers,
            right: nFormatter(_count, { full: true }),
          })) ?? [],
      },
    ],
    [countriesCount, platformsCount, subscribersCount],
  );

  const multiFilters = useMemo(() => ({}), []) as Record<string, string[]>;

  const activeFilters = useMemo(() => {
    const { country, platform, subscribers } = searchParamsObj;

    return [
      ...Object.entries(multiFilters)
        .map(([key, value]) => ({ key, value }))
        .filter(({ value }) => value.length > 0),

      ...(country ? [{ key: "country", value: country }] : []),
      ...(platform ? [{ key: "platform", value: platform }] : []),
      ...(subscribers ? [{ key: "subscribers", value: subscribers }] : []),
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
        del: ["country", "starred", "platform", "subscribers"],
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
