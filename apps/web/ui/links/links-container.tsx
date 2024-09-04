"use client";

import useLinks from "@/lib/swr/use-links";
import useLinksCount from "@/lib/swr/use-links-count";
import { LinkWithTagsProps, UserProps } from "@/lib/types";
import { PaginationControls } from "@dub/blocks/src/pagination-controls";
import {
  CardList,
  MaxWidthWrapper,
  useInputFocused,
  usePagination,
} from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useState,
} from "react";
import ArchivedLinksHint from "./archived-links-hint";
import { LinkCard } from "./link-card";
import LinkCardPlaceholder from "./link-card-placeholder";
import LinkNotFound from "./link-not-found";
import { LinksDisplayContext } from "./links-display-provider";
import NoLinksPlaceholder from "./no-links-placeholder";

export type ResponseLink = LinkWithTagsProps & {
  user: UserProps;
};

export default function LinksContainer({
  AddEditLinkButton,
}: {
  AddEditLinkButton: () => JSX.Element;
}) {
  const { viewMode, sort, showArchived } = useContext(LinksDisplayContext);

  const { links, isValidating } = useLinks({ sort, showArchived });
  const { data: count } = useLinksCount({ showArchived });

  return (
    <MaxWidthWrapper className="grid gap-y-2">
      <LinksList
        AddEditLinkButton={AddEditLinkButton}
        links={links}
        count={count}
        loading={isValidating}
        compact={viewMode === "rows"}
      />
    </MaxWidthWrapper>
  );
}

export const LinksListContext = createContext<{
  openMenuLinkId: string | null;
  setOpenMenuLinkId: Dispatch<SetStateAction<string | null>>;
  showHoverStates: boolean;
}>({
  openMenuLinkId: null,
  setOpenMenuLinkId: () => {},
  showHoverStates: true,
});

function LinksList({
  AddEditLinkButton,
  links,
  count,
  loading,
  compact,
}: {
  AddEditLinkButton: () => JSX.Element;
  links?: ResponseLink[];
  count?: number;
  loading?: boolean;
  compact: boolean;
}) {
  const searchParams = useSearchParams();
  const showHoverStates = !useInputFocused();

  const { pagination, setPagination } = usePagination();

  const [openMenuLinkId, setOpenMenuLinkId] = useState<string | null>(null);

  const isFiltered = [
    "domain",
    "tagId",
    "userId",
    "search",
    "showArchived",
  ].some((param) => searchParams.has(param));

  return (
    <>
      {!links || links.length ? (
        <LinksListContext.Provider
          value={{ openMenuLinkId, setOpenMenuLinkId, showHoverStates }}
        >
          {/* Cards */}
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
        </LinksListContext.Provider>
      ) : isFiltered ? (
        <LinkNotFound />
      ) : (
        <NoLinksPlaceholder AddEditLinkButton={AddEditLinkButton} />
      )}

      {/* Pagination */}
      {links && (
        <>
          <div className="h-[90px]" />
          <div
            className={cn(
              "fixed bottom-4 left-1/2 w-full max-w-[768px] -translate-x-1/2 px-2.5",
              "max-[920px]:bottom-5 max-[920px]:pr-20",
            )}
          >
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 [filter:drop-shadow(0_5px_8px_#222A351d)]">
              <PaginationControls
                pagination={pagination}
                setPagination={setPagination}
                totalCount={count ?? links?.length ?? 0}
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
          </div>
        </>
      )}
    </>
  );
}
