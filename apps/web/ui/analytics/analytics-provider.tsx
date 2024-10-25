"use client";

import {
  ANALYTICS_VIEWS,
  EVENT_TYPES,
  VALID_ANALYTICS_FILTERS,
} from "@/lib/analytics/constants";
import {
  AnalyticsResponseOptions,
  AnalyticsView,
  EventType,
} from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { PlanProps } from "@/lib/types";
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

export interface dashboardProps {
  domain: string;
  key: string;
  url: string;
  showConversions?: boolean;
  workspacePlan?: PlanProps;
}

export const AnalyticsContext = createContext<{
  basePath: string;
  baseApiPath: string;
  selectedTab: EventType;
  view: AnalyticsView;
  domain?: string;
  key?: string;
  linkId?: string;
  url?: string;
  queryString: string;
  start?: Date;
  end?: Date;
  interval?: string;
  tagId?: string;
  totalEvents?: {
    [key in AnalyticsResponseOptions]: number;
  };
  adminPage?: boolean;
  demoPage?: boolean;
  requiresUpgrade?: boolean;
  dashboardProps?: dashboardProps;
}>({
  basePath: "",
  baseApiPath: "",
  selectedTab: "clicks",
  view: "default",
  domain: "",
  linkId: undefined,
  queryString: "",
  start: new Date(),
  end: new Date(),
  adminPage: false,
  demoPage: false,
  requiresUpgrade: false,
  dashboardProps: undefined,
});

export default function AnalyticsProvider({
  adminPage,
  demoPage,
  dashboardProps,
  children,
}: PropsWithChildren<{
  adminPage?: boolean;
  demoPage?: boolean;
  dashboardProps?: dashboardProps;
}>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { id: workspaceId, slug, conversionEnabled } = useWorkspace();
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  let { dashboardId } = useParams() as {
    dashboardId?: string;
  };

  const linkId = searchParams?.get("linkId") || undefined;

  const domainSlug = searchParams?.get("domain");
  // key can be a query param (stats pages in app) or passed as a staticKey (shared analytics dashboards)
  const key = searchParams?.get("key") || dashboardProps?.key;

  // Whether to show conversions in shared analytics dashboards
  const showConversions = dashboardProps?.showConversions;

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
    if (!!adminPage && !!demoPage && !conversionEnabled && !showConversions)
      return "clicks";

    const event = searchParams.get("event");

    return EVENT_TYPES.find((t) => t === event) ?? "clicks";
  }, [searchParams.get("event")]);

  const view: AnalyticsView = useMemo(() => {
    if (!adminPage && !demoPage && !conversionEnabled && !showConversions)
      return "default";

    const view = searchParams.get("view");

    return ANALYTICS_VIEWS.find((v) => v === view) ?? "default";
  }, [searchParams.get("view")]);

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
      // Public stats page, e.g. app.dub.co/share/dsh_123
      return {
        basePath: `/share/${dashboardId}`,
        baseApiPath: "/api/analytics/dashboard",
        domain: dashboardProps?.domain,
      };
    }
  }, [
    adminPage,
    demoPage,
    slug,
    pathname,
    dashboardProps?.domain,
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
    [key in AnalyticsResponseOptions]: number;
  }>(
    `${baseApiPath}?${editQueryString(queryString, {
      event:
        adminPage || demoPage || conversionEnabled || showConversions
          ? "composite"
          : "clicks",
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
        basePath, // basePath for the page (e.g. /[slug]/analytics, /share/[dashboardId])
        baseApiPath, // baseApiPath for analytics API endpoints (e.g. /api/analytics)
        selectedTab, // selected event tab (clicks, leads, sales)
        view,
        queryString,
        domain: domain || undefined, // domain for the link (e.g. dub.sh, stey.me, etc.)
        key: key ? decodeURIComponent(key) : undefined, // link key (e.g. github, weathergpt, etc.)
        url: dashboardProps?.url, // url for the link (only for public stats pages)
        linkId,
        start, // start of time period
        end, // end of time period
        interval, /// time period interval
        tagId, // id of a single tag
        totalEvents, // totalEvents (clicks, leads, sales)
        adminPage, // whether the user is an admin
        demoPage, // whether the user is viewing demo analytics
        dashboardProps,
        requiresUpgrade, // whether an upgrade is required to perform the query
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}
