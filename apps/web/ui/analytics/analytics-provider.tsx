"use client";

import {
  EVENT_TYPES,
  VALID_ANALYTICS_FILTERS,
} from "@/lib/analytics/constants";
import {
  CompositeAnalyticsResponseOptions,
  EventType,
} from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { fetcher } from "@dub/utils";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import {
  PropsWithChildren,
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { defaultConfig } from "swr/_internal";
import { UpgradeRequiredToast } from "../shared/upgrade-required-toast";

export const AnalyticsContext = createContext<{
  basePath: string;
  baseApiPath: string;
  selectedTab: EventType;
  domain?: string;
  key?: string;
  url?: string;
  queryString: string;
  start?: Date;
  end?: Date;
  interval?: string;
  tagId?: string;
  totalEvents?: {
    [key in CompositeAnalyticsResponseOptions]: number;
  };
  adminPage?: boolean;
  demoPage?: boolean;
  requiresUpgrade?: boolean;
}>({
  basePath: "",
  baseApiPath: "",
  selectedTab: "clicks",
  domain: "",
  queryString: "",
  start: new Date(),
  end: new Date(),
  adminPage: false,
  demoPage: false,
  requiresUpgrade: false,
});

export default function AnalyticsProvider({
  staticDomain,
  staticUrl,
  adminPage,
  demoPage,
  eventsPage,
  children,
}: PropsWithChildren<{
  staticDomain?: string;
  staticUrl?: string;
  adminPage?: boolean;
  demoPage?: boolean;
  eventsPage?: boolean;
}>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { id: workspaceId, slug, betaTester } = useWorkspace();
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  let { key } = useParams() as {
    key?: string;
  };
  const domainSlug = searchParams?.get("domain");
  // key can be a path param (public stats pages) or a query param (stats pages in app)
  key = searchParams?.get("key") || key;

  const tagId = searchParams?.get("tagId") ?? undefined;

  // Default to last 24 hours
  const { start, end } = useMemo(() => {
    const hasRange = searchParams?.has("start") && searchParams?.has("end");

    return {
      start: hasRange
        ? startOfDay(
            new Date(searchParams?.get("start") || subDays(new Date(), 1)),
          )
        : undefined,

      end: hasRange
        ? endOfDay(new Date(searchParams?.get("end") || new Date()))
        : undefined,
    };
  }, [searchParams?.get("start"), searchParams?.get("end")]);

  // Only set interval if start and end are not provided
  const interval =
    start || end ? undefined : searchParams?.get("interval") ?? "24h";

  const selectedTab: EventType = useMemo(() => {
    if (!demoPage && !betaTester) return "clicks";

    const tab = searchParams.get("tab");

    return tab && (EVENT_TYPES as ReadonlyArray<string>).includes(tab)
      ? (tab as EventType)
      : "composite";
  }, [searchParams.get("tab")]);

  const root = searchParams.get("root")
    ? searchParams.get("root") === "true"
    : undefined;

  const { basePath, domain, baseApiPath } = useMemo(() => {
    if (adminPage) {
      return {
        basePath: `/analytics`,
        baseApiPath: `/api/analytics/admin`,
        domain: domainSlug,
      };
    } else if (demoPage) {
      return {
        basePath: `/analytics/demo`,
        baseApiPath: `/api/analytics/demo`,
        domain: domainSlug,
      };
    } else if (slug) {
      return {
        basePath: `/${slug}/analytics`,
        baseApiPath: `/api/analytics`,
        domain: domainSlug,
      };
    } else {
      // Public stats page, e.g. dub.co/stats/github, stey.me/stats/weathergpt
      return {
        basePath: `/stats/${key}`,
        baseApiPath: `/api/analytics/edge`,
        domain: staticDomain,
      };
    }
  }, [
    adminPage,
    demoPage,
    slug,
    pathname,
    staticDomain,
    domainSlug,
    key,
    selectedTab,
  ]);

  const queryString = useMemo(() => {
    const availableFilterParams = VALID_ANALYTICS_FILTERS.reduce(
      (acc, filter) => ({
        ...acc,
        ...(searchParams?.get(filter) && {
          [filter]: searchParams.get(filter),
        }),
      }),
      {},
    );
    return new URLSearchParams({
      ...availableFilterParams,
      ...(workspaceId && { workspaceId }),
      ...(domain && { domain }),
      ...(key && { key }),
      ...(start &&
        end && { start: start.toISOString(), end: end.toISOString() }),
      ...(interval && { interval }),
      ...(tagId && { tagId }),
      ...(root && { root: root.toString() }),
      event: selectedTab,
    }).toString();
  }, [workspaceId, domain, key, searchParams, start, end, tagId, selectedTab]);

  // Reset requiresUpgrade when query changes
  useEffect(() => setRequiresUpgrade(false), [queryString]);

  const { data: totalEvents } = useSWR<{
    [key in CompositeAnalyticsResponseOptions]: number;
  }>(
    `${baseApiPath}?${editQueryString(queryString, {
      event: demoPage || betaTester ? "composite" : "clicks",
    })}`,
    fetcher,
    {
      onSuccess: () => setRequiresUpgrade(false),
      onError: (error) => {
        const errorMessage = JSON.parse(error.message)?.error.message;
        if (
          error.status === 403 &&
          errorMessage.toLowerCase().includes("upgrade")
        ) {
          toast.custom(() => (
            <UpgradeRequiredToast
              title="Upgrade for more analytics"
              message={errorMessage}
            />
          ));
          setRequiresUpgrade(true);
        } else {
          toast.error(errorMessage);
        }
      },
      onErrorRetry: (error, ...args) => {
        if (error.message.includes("Upgrade to Pro")) return;
        defaultConfig.onErrorRetry(error, ...args);
      },
    },
  );

  return (
    <AnalyticsContext.Provider
      value={{
        basePath, // basePath for the page (e.g. /stats/[key], /[slug]/analytics)
        baseApiPath, // baseApiPath for analytics API endpoints (e.g. /api/analytics)
        selectedTab, // selected tab (clicks, leads, sales)
        queryString,
        domain: domain || undefined, // domain for the link (e.g. dub.sh, stey.me, etc.)
        key: key ? decodeURIComponent(key) : undefined, // link key (e.g. github, weathergpt, etc.)
        url: staticUrl, // url for the link (only for public stats pages)
        start, // start of time period
        end, // end of time period
        interval, /// time period interval
        tagId, // id of a single tag
        totalEvents, // totalEvents (clicks, leads, sales)
        adminPage, // whether the user is an admin
        demoPage, // whether the user is viewing demo analytics
        requiresUpgrade, // whether an upgrade is required to perform the query
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}
