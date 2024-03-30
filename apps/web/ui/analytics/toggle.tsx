import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { BlurImage, ExpandingArrow, useScroll } from "@dub/ui";
import {
  DUB_LOGO,
  GOOGLE_FAVICON_URL,
  cn,
  getApexDomain,
  linkConstructor,
} from "@dub/utils";
import punycode from "punycode/";
import { useContext } from "react";
import { AnalyticsContext } from ".";
import ExportButton from "./export-button";
import SharePopover from "./share-popover";
import DateRangePicker from "./date-range-picker";
import FilterBar from "./filter-bar";

export default function Toggle() {
  const { basePath, domain, key, url, admin } = useContext(AnalyticsContext);

  const scrolled = useScroll(80);

  const isPublicStatsPage = basePath.startsWith("/stats");

  return (
    <>
      <div className="mx-auto w-full max-w-4xl md:hidden">
        <h2 className="truncate text-center text-2xl text-gray-600">
          Link Analytics
        </h2>
      </div>
      <div
        className={cn(
          "sticky top-[6.85rem] z-10 mb-5 bg-gray-50 py-3 md:py-3",
          {
            "top-14": isPublicStatsPage,
            "top-0": admin,
            "shadow-md": scrolled,
          },
        )}
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
            <div className="hidden items-center space-x-2 truncate pr-2 md:flex">
              <h2 className="truncate text-2xl text-gray-600">
                Link Analytics
              </h2>
            </div>
            <div
              className={cn("flex items-center gap-2", {
                "w-full flex-col min-[550px]:flex-row md:w-auto": !key,
                "w-full md:w-auto": key,
              })}
            >
              {!isPublicStatsPage && !key && <FilterBar />}
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
    </>
  );
}
