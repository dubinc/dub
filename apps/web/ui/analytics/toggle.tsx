import { INTERVALS } from "@/lib/analytics";
import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  BadgeTooltip,
  BlurImage,
  ExpandingArrow,
  Tick,
  useRouterStuff,
  useScroll,
} from "@dub/ui";
import {
  DUB_LOGO,
  GOOGLE_FAVICON_URL,
  SHORT_DOMAIN,
  cn,
  getApexDomain,
  linkConstructor,
} from "@dub/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import punycode from "punycode/";
import { useContext, useMemo, useState } from "react";
import { AnalyticsContext } from ".";
import ExportButton from "./export-button";
import SharePopover from "./share-popover";
import TagSelector from "./tag-selector";
import DateRangePicker from "./date-range-picker";
import FilterList from "./filter-bar";
import FilterBar from "./filter-bar";

export default function Toggle() {
  const { basePath, domain, key, url, admin } = useContext(AnalyticsContext);

  const scrolled = useScroll(80);
  const { name, logo } = useWorkspace();
  const { primaryDomain } = useDomains();

  const isPublicStatsPage = basePath.startsWith("/stats");

  return (
    <div
      className={cn("sticky top-[6.85rem] z-10 mb-5 bg-gray-50 py-3 md:py-5", {
        "top-14": isPublicStatsPage,
        "top-0": admin,
        "shadow-md": scrolled,
      })}
    >
      <div className="mx-auto flex h-20 max-w-4xl flex-col items-center justify-between space-y-3 px-2.5 md:h-10 md:flex-row md:space-y-0 lg:px-0">
        {isPublicStatsPage ? (
          <a
            className="group flex items-center text-lg font-semibold text-gray-800"
            href={linkConstructor({ domain, key })}
            target="_blank"
            rel="noreferrer"
          >
            <BlurImage
              alt={url || "Dub.co"}
              src={
                url ? `${GOOGLE_FAVICON_URL}${getApexDomain(url)}` : DUB_LOGO
              }
              className="mr-2 h-6 w-6 flex-shrink-0 overflow-hidden rounded-full"
              width={48}
              height={48}
            />
            {linkConstructor({
              domain: punycode.toUnicode(domain),
              key,
              pretty: true,
            })}
            <ExpandingArrow className="h-5 w-5" />
          </a>
        ) : (
          <div className="flex items-center space-x-2 pr-2">
            <BlurImage
              alt={name || "Workspace Logo"}
              src={logo || DUB_LOGO}
              className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full"
              width={48}
              height={48}
            />
            <h2 className="truncate text-lg font-semibold text-gray-800">
              {primaryDomain}
            </h2>
          </div>
        )}
        <div className="flex w-full items-center justify-end gap-2">
          {!isPublicStatsPage && key && <SharePopover />}
          {!isPublicStatsPage && !key && <FilterBar />}
          <DateRangePicker />
          {!isPublicStatsPage && <ExportButton />}
        </div>
      </div>
    </div>
  );
}

const DomainsFilterTooltip = () => {
  const { allActiveDomains } = useDomains();
  const searchParams = useSearchParams();
  const domain = searchParams?.get("domain");
  const key = searchParams?.get("key");
  const { queryParams } = useRouterStuff();

  return (
    <div className="flex w-full flex-col items-start space-y-2 divide-y divide-gray-200 p-2 md:w-48">
      <div className="flex w-full flex-col">
        {allActiveDomains.map(({ slug, target }) => (
          <Link
            key={slug}
            href={
              queryParams({
                set: {
                  domain: slug,
                },
                del: "key",
                getNewPath: true,
              }) as string
            }
            className="group flex items-center justify-between space-x-2 rounded-md p-2 text-gray-500 transition-all hover:bg-gray-100 active:bg-gray-200"
          >
            <div className="flex items-center space-x-2">
              <BlurImage
                src={`${GOOGLE_FAVICON_URL}${
                  target ? getApexDomain(target) : SHORT_DOMAIN
                }`}
                alt={slug}
                className="h-5 w-5 rounded-full"
                width={20}
                height={20}
              />
              <p className="w-32 truncate text-left text-sm font-semibold text-gray-500">
                {slug}
              </p>
            </div>
            {domain === slug && !key && <Tick className="h-4 w-4" />}
          </Link>
        ))}
      </div>
    </div>
  );
};
