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
      className={cn("sticky top-[6.85rem] z-10 mb-5 bg-gray-50 py-3 md:py-3", {
        "top-14": isPublicStatsPage,
        "top-0": admin,
        "shadow-md": scrolled,
      })}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-4xl flex-col gap-2 space-y-3 px-2.5 md:space-y-0 lg:px-0 ",
          {
            // "md:h-24": !key,
            "md:h-10": key,
          },
        )}
      >
        <div className="flex w-full items-center justify-between gap-2">
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
            <div className="flex items-center space-x-2 truncate pr-2">
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
          <div className="flex items-center gap-2">
            {!isPublicStatsPage && !key && <FilterBar />}
            {!isPublicStatsPage && key && <SharePopover />}
            <DateRangePicker />
            {!isPublicStatsPage && <ExportButton />}
          </div>
        </div>
        {/* <div className="flex w-full">
          {!isPublicStatsPage && !key && <FilterBar />}
        </div> */}
      </div>
    </div>
  );
}
