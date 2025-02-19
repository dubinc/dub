import { LoadingSpinner, PaginationControls, usePagination } from "@dub/ui";
import { cn } from "@dub/utils";
import { X } from "../shared/icons";
import ArchivedLinksHint from "./archived-links-hint";
import { useLinkSelection } from "./link-selection-provider";

export const LinksToolbar = ({
  loading,
  linksCount,
}: {
  loading: boolean;
  linksCount: number;
}) => {
  const { selectedLinkIds, setSelectedLinkIds } = useLinkSelection();
  const { pagination, setPagination } = usePagination();

  return (
    <>
      {/* Leave room at bottom of list */}
      <div className="h-[90px]" />

      <div className="fixed bottom-4 left-0 w-full sm:max-[1330px]:w-[calc(100%-150px)] md:left-[240px] md:w-[calc(100%-240px)] md:max-[1330px]:w-[calc(100%-240px-150px)]">
        <div
          className={cn(
            "relative left-1/2 w-full max-w-[768px] -translate-x-1/2 px-5",
            "max-[1330px]:left-0 max-[1330px]:translate-x-0",
          )}
        >
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white [filter:drop-shadow(0_5px_8px_#222A351d)]">
            <div
              className={cn(
                "relative px-4 py-3.5 transition-[opacity,transform] duration-100",
                selectedLinkIds.length > 0 &&
                  "absolute inset-0 translate-y-1/2 opacity-0",
              )}
            >
              <PaginationControls
                pagination={pagination}
                setPagination={setPagination}
                totalCount={linksCount}
                unit={(plural) => `${plural ? "links" : "link"}`}
              >
                {loading ? (
                  <LoadingSpinner className="size-3.5" />
                ) : (
                  <div className="hidden sm:block">
                    <ArchivedLinksHint />
                  </div>
                )}
              </PaginationControls>
            </div>

            <div
              className={cn(
                "relative px-4 py-3.5 transition-[opacity,transform] duration-100",
                !selectedLinkIds.length &&
                  "absolute inset-0 translate-y-1/2 opacity-0",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLinkIds([])}
                    className="rounded-md p-1.5 transition-colors duration-75 hover:bg-neutral-50 active:bg-neutral-100"
                  >
                    <X className="size-4 text-neutral-900" />
                  </button>
                  <span className="text-sm font-medium text-neutral-600">
                    <strong className="font-semibold">
                      {selectedLinkIds.length}
                    </strong>{" "}
                    selected
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
