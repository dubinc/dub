import { AnalyticsGroupByOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { BlurImage } from "@dub/ui";
import { GOOGLE_FAVICON_URL, fetcher } from "@dub/utils";
import { QrCode } from "lucide-react";
import { ComponentType, ReactNode, SVGProps, useContext, useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import { AnalyticsContext } from ".";
import DeviceIcon from "./device-icon";

type AnalyticsFilterResult =
  | ({ count?: number } & Record<string, any>)[]
  | null;

/**
 * Fetches event counts grouped by the specified filter
 *
 * @param groupByOrParams Either a groupBy option or a query parameter object including groupBy
 * @param options Additional options
 */
export function useAnalyticsFilterOption(
  groupByOrParams:
    | AnalyticsGroupByOptions
    | ({ groupBy: AnalyticsGroupByOptions } & Record<string, any>),
  options?: { cacheOnly?: boolean },
): AnalyticsFilterResult {
  const { cache } = useSWRConfig();

  const { baseApiPath, queryString, selectedTab, requiresUpgrade } =
    useContext(AnalyticsContext);

  const enabled =
    !options?.cacheOnly ||
    [...cache.keys()].includes(
      `${baseApiPath}?${editQueryString(queryString, {
        ...(typeof groupByOrParams === "string"
          ? { groupBy: groupByOrParams }
          : groupByOrParams),
      })}`,
    );

  const { data } = useSWR<Record<string, any>[]>(
    enabled
      ? `${baseApiPath}?${editQueryString(queryString, {
          ...(typeof groupByOrParams === "string"
            ? { groupBy: groupByOrParams }
            : groupByOrParams),
        })}`
      : null,
    fetcher,
    {
      shouldRetryOnError: !requiresUpgrade,
    },
  );

  return (
    data?.map((d) => ({
      ...d,
      count:
        ((d[selectedTab] ?? d["clicks"]) as number | undefined) ?? undefined,
    })) ?? null
  );
}

/**
 * Returns a random item from the first `n` items of the array
 */
function randomItem<T>(arr: T[] | null | undefined, n?: number) {
  return arr && arr.length
    ? arr[Math.floor(Math.random() * Math.min(arr.length, n || arr.length))]
    : null;
}

export function useAIFilterSuggestions({
  domains,
  countries,
  devices,
}: {
  domains?: { slug: string }[];
  countries?: AnalyticsFilterResult;
  devices?: AnalyticsFilterResult;
}):
  | {
      value: string;
      icon: ComponentType<SVGProps<SVGSVGElement>> | ReactNode;
    }[]
  | null {
  const domainSuggestions = useMemo(() => {
    const randomDomain = randomItem(
      domains?.filter(({ slug }) => slug.length < 14),
    );
    return randomDomain
      ? [
          {
            value: `Clicks on links from the ${randomDomain.slug} domain`,
            icon: (
              <BlurImage
                src={`${GOOGLE_FAVICON_URL}${randomDomain.slug}`}
                alt={randomDomain.slug}
                className="h-4 w-4 rounded-full"
                width={16}
                height={16}
              />
            ),
          },
        ]
      : [];
  }, [domains]);

  const countrySuggestions = useMemo(() => {
    const randomCountry = randomItem(countries, 4);
    return randomCountry
      ? [
          {
            value: `QR code scans in the last 30 days, ${randomCountry.country} only`,
            icon: QrCode,
          },
        ]
      : [];
  }, [countries]);

  const deviceSuggestions = useMemo(() => {
    const randomDevice = randomItem(devices, 2);
    return randomDevice
      ? [
          {
            value: `${randomDevice.device} clicks from the last 90 days`,
            icon: (
              <DeviceIcon
                display={randomDevice.device}
                tab="devices"
                className="h-4 w-4"
              />
            ),
          },
        ]
      : [];
  }, [devices]);

  const allSuggestions = useMemo(() => {
    const all = [
      ...countrySuggestions,
      ...deviceSuggestions,
      ...domainSuggestions,
    ];

    if (!all.length && !domains && !countries && !devices) return null;

    return all;
  }, [domainSuggestions, countrySuggestions, deviceSuggestions]);

  return allSuggestions;
}
