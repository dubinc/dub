"use client";
/* 
  This Stats component lives in 3 different places:
  1. Project link page, e.g. app.dub.co/dub/dub.sh/github
  2. Generic Dub.co link page, e.g. app.dub.co/links/steven
  3. Public stats page, e.g. dub.co/stats/github, stey.me/stats/weathergpt

  We use the `useEndpoint()` hook to get the correct layout
*/

import { X } from "lucide-react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { createContext, useMemo } from "react";
import Clicks from "./clicks";
import TopLinks from "./top-links";
import Devices from "./devices";
import Locations from "./locations";
import Referer from "./referer";
import Toggle from "./toggle";
import Feedback from "./feedback";
import useSWR from "swr";
import { fetcher } from "@dub/utils";
import { VALID_STATS_FILTERS } from "@/lib/stats";

export const StatsContext = createContext<{
  basePath: string;
  baseApiPath: string;
  domain?: string;
  key?: string;
  queryString: string;
  interval: string;
  totalClicks?: number;
  modal?: boolean;
}>({
  basePath: "",
  baseApiPath: "",
  domain: "",
  key: "",
  queryString: "",
  interval: "",
});

export default function Stats({
  staticDomain,
  modal,
}: {
  staticDomain?: string;
  modal?: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  let { slug, key } = useParams() as {
    slug?: string;
    key?: string;
  };
  const domainSlug = searchParams?.get("domain");
  // key can be a path param (public stats pages) or a query param (stats pages in app)
  key = searchParams?.get("key") || key;
  const interval = searchParams?.get("interval") || "24h";

  const { basePath, domain, baseApiPath } = useMemo(() => {
    // Project link analytics page, e.g. app.dub.co/dub/analytics?domain=dub.sh&key=github
    if (slug) {
      return {
        basePath: `/${slug}/analytics`,
        baseApiPath: `/api/projects/${slug}/stats`,
        domain: domainSlug,
      };
      // Generic links analytics page, e.g. app.dub.co/analytics?domain=dub.sh&key=github
    } else if (pathname === "/analytics") {
      return {
        basePath: `/analytics`,
        baseApiPath: `/api/stats`,
        domain: domainSlug,
      };
    }

    // Public stats page, e.g. dub.co/stats/github, stey.me/stats/weathergpt
    return {
      basePath: `/stats/${key}`,
      baseApiPath: `/api/edge/stats`,
      domain: staticDomain,
    };
  }, [slug, pathname, staticDomain, domainSlug, key]);

  const queryString = useMemo(() => {
    const availableFilterParams = VALID_STATS_FILTERS.reduce(
      (acc, filter) => ({
        ...acc,
        ...(searchParams?.get(filter) && {
          [filter]: searchParams.get(filter),
        }),
      }),
      {},
    );
    return new URLSearchParams({
      ...(domain && { domain }),
      ...(key && { key }),
      ...availableFilterParams,
      ...(interval && { interval }),
    }).toString();
  }, [slug, domain, key, searchParams, interval]);

  const { data: totalClicks } = useSWR<number>(
    `${baseApiPath}/clicks?${queryString}`,
    fetcher,
  );

  return (
    <StatsContext.Provider
      value={{
        basePath, // basePath for the page (e.g. /stats/[key], /links/[key], /[slug]/[domain]/[key])
        baseApiPath, // baseApiPath for the API (e.g. /api/edge/links/[key]/stats)
        queryString,
        domain: domain || undefined, // domain for the link (e.g. dub.sh, stey.me, etc.)
        key: key ? decodeURIComponent(key) : undefined, // link key (e.g. github, weathergpt, etc.)
        interval, // time interval (e.g. 24h, 7d, 30d, etc.)
        totalClicks, // total clicks for the link
        modal, // whether or not this is a modal
      }}
    >
      {modal && (
        <button
          className="group sticky right-4 top-4 z-30 float-right hidden rounded-full p-3 transition-all duration-75 hover:bg-gray-100 focus:outline-none active:scale-75 md:block"
          autoFocus={false}
          onClick={() => router.back()}
        >
          <X className="h-6 w-6" />
        </button>
      )}
      <div className="bg-gray-50 py-10">
        <Toggle />
        <div className="mx-auto grid max-w-4xl gap-5">
          <Clicks />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Locations />
            {slug && <TopLinks />}
            <Devices />
            <Referer />
            {!slug && <Feedback />}
          </div>
        </div>
      </div>
    </StatsContext.Provider>
  );
}
