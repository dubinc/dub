"use client";

import useLinks from "@/lib/swr/use-links";
import useLinksCount from "@/lib/swr/use-links-count";
import { ExpandedLinkProps, UserProps } from "@/lib/types";
import {
  CardList,
  MaxWidthWrapper,
  PaginationControls,
  usePagination,
} from "@dub/ui";
import { CursorRays, Hyperlink, LoadingSpinner } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useState,
} from "react";
import { AnimatedEmptyState } from "../shared/animated-empty-state";
import { X } from "../shared/icons";
import ArchivedLinksHint from "./archived-links-hint";
import { LinkCard } from "./link-card";
import LinkCardPlaceholder from "./link-card-placeholder";
import { LinksDisplayContext } from "./links-display-provider";

export type ResponseLink = ExpandedLinkProps & {
  user: UserProps;
};

export default function LinksContainer({
  CreateLinkButton,
}: {
  CreateLinkButton: () => JSX.Element;
}) {
  const { viewMode, sortBy, showArchived } = useContext(LinksDisplayContext);

  const { links, isValidating } = useLinks({ sortBy, showArchived });
  const { data: count } = useLinksCount<number>({ showArchived });

  return (
    <MaxWidthWrapper className="grid gap-y-2">
      <LinksList
        CreateLinkButton={CreateLinkButton}
        links={links}
        count={count}
        loading={isValidating}
        compact={viewMode === "rows"}
      />
    </MaxWidthWrapper>
  );
}

export const LinksListContext = createContext<{
  selectedLinkIds: string[];
  setSelectedLinkIds: Dispatch<SetStateAction<string[]>>;
  openMenuLinkId: string | null;
  setOpenMenuLinkId: Dispatch<SetStateAction<string | null>>;
}>({
  selectedLinkIds: [],
  setSelectedLinkIds: () => {},
  openMenuLinkId: null,
  setOpenMenuLinkId: () => {},
});

function LinksList({
  CreateLinkButton,
  links,
  count,
  loading,
  compact,
}: {
  CreateLinkButton: () => JSX.Element;
  links?: ResponseLink[];
  count?: number;
  loading?: boolean;
  compact: boolean;
}) {
  const searchParams = useSearchParams();

  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);
  const [openMenuLinkId, setOpenMenuLinkId] = useState<string | null>(null);

  const isFiltered = [
    "folderId",
    "tagIds",
    "domain",
    "userId",
    "search",
    "showArchived",
  ].some((param) => searchParams.has(param));

  return (
    <LinksListContext.Provider
      value={{
        selectedLinkIds,
        setSelectedLinkIds,
        openMenuLinkId,
        setOpenMenuLinkId,
      }}
    >
      {!links || links.length ? (
        // Cards
        <CardList variant={compact ? "compact" : "loose"} loading={loading}>
          {links?.length
            ? // Link cards
              links.map((link) => <LinkCard key={link.id} link={link} />)
            : // Loading placeholder cards
              Array.from({ length: 12 }).map((_, idx) => (
                <CardList.Card
                  key={idx}
                  outerClassName="pointer-events-none"
                  innerClassName="flex items-center gap-4"
                >
                  <LinkCardPlaceholder />
                </CardList.Card>
              ))}
        </CardList>
      ) : (
        <AnimatedEmptyState
          title={isFiltered ? "No links found" : "No links yet"}
          description={
            isFiltered
              ? "Bummer! There are no links that match your filters. Adjust your filters to yield more results."
              : "Start creating short links for your marketing campaigns, referral programs, and more."
          }
          cardContent={
            <>
              <Hyperlink className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-neutral-500">
                <CursorRays className="size-3.5" />
              </div>
            </>
          }
          {...(!isFiltered && {
            addButton: (
              <div>
                <CreateLinkButton />
              </div>
            ),
            learnMoreHref: "https://dub.co/help/article/how-to-create-link",
            learnMoreClassName: "h-10",
          })}
        />
      )}

      {/* Pagination */}
      {links && (
        <FloatingToolbar
          loading={!!loading}
          linksCount={count ?? links?.length ?? 0}
        />
      )}
    </LinksListContext.Provider>
  );
}

const FloatingToolbar = ({
  loading,
  linksCount,
}: {
  loading: boolean;
  linksCount: number;
}) => {
  const { selectedLinkIds, setSelectedLinkIds } = useContext(LinksListContext);
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
