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
}>({
  basePath: "",
  baseApiPath: "",
  domain: "",
  key: "",
  queryString: "",
  interval: "",
});

export default function Stats({ staticDomain }: { staticDomain?: string }) {
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
    } else {
      // Public stats page, e.g. dub.co/stats/github, stey.me/stats/weathergpt
      return {
        basePath: `/stats/${key}`,
        baseApiPath: `/api/edge/stats`,
        domain: staticDomain,
      };
    }
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
        baseApiPath, // baseApiPath for the API (e.g. /api/links/[key]/stats)
        queryString,
        domain: domain || undefined, // domain for the link (e.g. dub.sh, stey.me, etc.)
        key: key ? decodeURIComponent(key) : undefined, // link key (e.g. github, weathergpt, etc.)
        interval, // time interval (e.g. 24h, 7d, 30d, etc.)
        totalClicks, // total clicks for the link
      }}
    >
      <div className="bg-gray-50 py-10">
        <Toggle />
        <div className="mx-auto grid max-w-4xl gap-5">
          <Clicks />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Locations />
            <TopLinks />
            <Devices />
            <Referer />
          </div>
        </div>
      </div>
    </StatsContext.Provider>
  );
}
