"use client";

import {
  ANALYTICS_SALE_UNIT,
  ANALYTICS_VIEWS,
  DUB_LINKS_ANALYTICS_INTERVAL,
  DUB_PARTNERS_ANALYTICS_INTERVAL,
} from "@/lib/analytics/constants";
import {
  AnalyticsResponseOptions,
  AnalyticsSaleUnit,
  AnalyticsView,
  EventType,
} from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useWorkspace from "@/lib/swr/use-workspace";
import { PlanProps } from "@/lib/types";
import { useLocalStorage } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { defaultConfig } from "swr/_internal";
import { UpgradeRequiredToast } from "../shared/upgrade-required-toast";
import { useAnalyticsQuery } from "./use-analytics-query";

export interface AnalyticsDashboardProps {
  domain: string;
  key: string;
  url: string;
  showConversions?: boolean;
  workspacePlan?: PlanProps;
}

export const AnalyticsContext = createContext<{
  basePath: string;
  baseApiPath: string;
  eventsApiPath?: string;
  selectedTab: EventType;
  saleUnit: AnalyticsSaleUnit;
  view: AnalyticsView;
  domain?: string;
  key?: string;
  url?: string;
  queryString: string;
  start?: Date;
  end?: Date;
  interval?: string;
  tagIds?: string;
  totalEvents?: {
    [key in AnalyticsResponseOptions]: number;
  };
  adminPage?: boolean;
  partnerPage?: boolean;
  showConversions?: boolean;
  requiresUpgrade?: boolean;
  dashboardProps?: AnalyticsDashboardProps;
}>({
  basePath: "",
  baseApiPath: "",
  eventsApiPath: "",
  selectedTab: "clicks",
  saleUnit: "saleAmount",
  view: "timeseries",
  domain: "",
  queryString: "",
  start: new Date(),
  end: new Date(),
  adminPage: false,
  partnerPage: false,
  showConversions: false,
  requiresUpgrade: false,
  dashboardProps: undefined,
});

export default function AnalyticsProvider({
  adminPage,
  dashboardProps,
  children,
}: PropsWithChildren<{
  adminPage?: boolean;
  dashboardProps?: AnalyticsDashboardProps;
}>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { slug, domains } = useWorkspace();

  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  const { dashboardId, programSlug } = useParams() as {
    dashboardId?: string;
    programSlug?: string;
  };

  const { partner } = usePartnerProfile();
  const partnerPage = partner?.id && programSlug ? true : false;

  const domainSlug = searchParams?.get("domain");

  // Show conversion tabs/data for all dashboards except shared (unless explicitly set)
  const showConversions =
    !dashboardProps || dashboardProps?.showConversions ? true : false;

  const [persistedSaleUnit, setPersistedSaleUnit] =
    useLocalStorage<AnalyticsSaleUnit>(`analytics-sale-unit`, "saleAmount");

  const saleUnit: AnalyticsSaleUnit = useMemo(() => {
    const searchParamsSaleUnit = searchParams.get(
      "saleUnit",
    ) as AnalyticsSaleUnit;
    if (ANALYTICS_SALE_UNIT.includes(searchParamsSaleUnit)) {
      setPersistedSaleUnit(searchParamsSaleUnit);
      return searchParamsSaleUnit;
    }
    return persistedSaleUnit;
  }, [searchParams.get("saleUnit")]);

  const [persistedView, setPersistedView] = useLocalStorage<AnalyticsView>(
    `analytics-view`,
    "timeseries",
  );
  const view: AnalyticsView = useMemo(() => {
    const searchParamsView = searchParams.get("view") as AnalyticsView;
    if (ANALYTICS_VIEWS.includes(searchParamsView)) {
      setPersistedView(searchParamsView);
      return searchParamsView;
    }

    return ANALYTICS_VIEWS.includes(persistedView)
      ? persistedView
      : "timeseries";
  }, [searchParams.get("view")]);

  const { basePath, domain, baseApiPath, eventsApiPath } = useMemo(() => {
    if (adminPage) {
      return {
        basePath: "analytics",
        baseApiPath: "/api/admin/analytics",
        eventsApiPath: "/api/admin/events",
        domain: domainSlug,
      };
    } else if (slug) {
      return {
        basePath: `/${slug}/analytics`,
        baseApiPath: "/api/analytics",
        eventsApiPath: "/api/events",
        domain: domainSlug,
      };
    } else if (partner?.id && programSlug) {
      return {
        basePath: `/api/partner-profile/programs/${programSlug}/analytics`,
        baseApiPath: `/api/partner-profile/programs/${programSlug}/analytics`,
        eventsApiPath: `/api/partner-profile/programs/${programSlug}/events`,
        domain: domainSlug,
      };
    } else if (dashboardId) {
      // Public stats page, e.g. app.dub.co/share/dsh_123
      return {
        basePath: `/share/${dashboardId}`,
        baseApiPath: "/api/analytics/dashboard",
        domain: dashboardProps?.domain,
      };
    } else {
      return {
        basePath: "",
        baseApiPath: "",
        domain: "", // TODO [refactor]
      };
    }
  }, [
    adminPage,
    slug,
    pathname,
    dashboardProps?.domain,
    dashboardId,
    partner?.id,
    programSlug,
    domainSlug,
  ]);

  const { queryString, key, start, end, interval, tagIds, selectedTab } =
    useAnalyticsQuery({
      domain: domain ?? undefined,
      defaultKey: dashboardProps?.key,
      defaultInterval: partnerPage
        ? DUB_PARTNERS_ANALYTICS_INTERVAL
        : DUB_LINKS_ANALYTICS_INTERVAL,

      /*
      If not explicitly set, show root domain links if:
        - it's filtered by a link, or
        - the workspace has more than 50 domains
        - is admin page
        - is filtered by a folder or tag
      Otherwise, hide root domain links
    */
      defaultRoot: ({ key, folderId, tagIds }) =>
        (domain && key) ||
        (domains && domains.length > 50) ||
        adminPage ||
        folderId ||
        tagIds
          ? undefined
          : "false",
    });

  // Reset requiresUpgrade when query changes
  useEffect(() => setRequiresUpgrade(false), [queryString]);

  const { data: totalEvents } = useSWR<{
    [key in AnalyticsResponseOptions]: number;
  }>(
    `${baseApiPath}?${editQueryString(queryString, {
      event: "composite",
    })}`,
    fetcher,
    {
      keepPreviousData: true,
      onSuccess: () => setRequiresUpgrade(false),
      onError: (error) => {
        try {
          const errorMessage = error.message;
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
        } catch (error) {
          toast.error(error);
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
        eventsApiPath, // eventsApiPath for events API endpoints (e.g. /api/events)
        saleUnit,
        view,
        queryString,
        domain: domain || undefined, // domain for the link (e.g. dub.sh, stey.me, etc.)
        key: key ? decodeURIComponent(key) : undefined, // link key (e.g. github, weathergpt, etc.)
        url: dashboardProps?.url, // url for the link (only for public stats pages)
        start, // start of time period
        end, // end of time period
        interval, /// time period interval
        tagIds, // ids of the tags to filter by
        totalEvents, // totalEvents (clicks, leads, sales)
        adminPage, // whether the user is an admin
        partnerPage, // whether the user is viewing partner analytics
        dashboardProps,
        showConversions, // Whether to show conversions tabs/data
        requiresUpgrade, // whether an upgrade is required to perform the query
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}
