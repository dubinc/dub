import { BlurImage, ExpandingArrow, useScroll } from "@dub/ui";
import {
  DUB_LOGO,
  GOOGLE_FAVICON_URL,
  cn,
  getApexDomain,
  linkConstructor,
  truncate,
} from "@dub/utils";
import { useContext } from "react";
import { AnalyticsContext } from ".";
import ExportButton from "./export-button";
import SharePopover from "./share-popover";
import DateRangePicker from "./date-range-picker";
import FilterBar from "./filter-bar";
import punycode from "punycode/";

export default function Toggle() {
  const { basePath, domain, key, url, admin } = useContext(AnalyticsContext);

  const scrolled = useScroll(80);

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
          "mx-auto flex w-full max-w-4xl flex-col gap-2 space-y-3 px-2.5 md:space-y-0 lg:px-0",
          {
            "md:h-10": key,
          },
        )}
      >
        <div
          className={cn(
            "flex w-full flex-col items-center justify-between gap-2 md:flex-row",
            {
              "flex-col md:flex-row": !key,
              "items-center": key,
            },
          )}
        >
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
              <p className="max-w-[192px] truncate sm:max-w-[400px]">
                {linkConstructor({
                  domain: punycode.toUnicode(domain),
                  key,
                  pretty: true,
                })}
              </p>
              <ExpandingArrow className="h-5 w-5" />
            </a>
          ) : (
            <h2 className="truncate text-2xl text-gray-600">Analytics</h2>
          )}
          <div
            className={cn("flex items-center gap-2", {
              "w-full flex-col min-[550px]:flex-row md:w-auto": !key,
              "w-full md:w-auto": key,
            })}
          >
            {!isPublicStatsPage && !key && !admin && <FilterBar />}
            {!isPublicStatsPage && key && <SharePopover />}
            <div
              className={cn("flex w-full items-center gap-2", {
                "min-[550px]:w-auto": !key,
                "justify-end": key,
              })}
            >
              <DateRangePicker />
              {!isPublicStatsPage && <ExportButton />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
