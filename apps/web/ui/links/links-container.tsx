"use client";

import useCurrentFolderId from "@/lib/swr/use-current-folder-id";
import useLinks from "@/lib/swr/use-links";
import useLinksCount from "@/lib/swr/use-links-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { ExpandedLinkProps, UserProps } from "@/lib/types";
import { CardList } from "@dub/ui";
import { CursorRays, Hyperlink } from "@dub/ui/icons";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
  type JSX,
} from "react";
import { PageWidthWrapper } from "../layout/page-width-wrapper";
import { AnimatedEmptyState } from "../shared/animated-empty-state";
import { LinkCard } from "./link-card";
import LinkCardPlaceholder from "./link-card-placeholder";
import { LinkSelectionProvider } from "./link-selection-provider";
import { LinksDisplayContext } from "./links-display-provider";
import { LinksToolbar } from "./links-toolbar";

export type ResponseLink = ExpandedLinkProps & {
  user: UserProps;
};

export default function LinksContainer({
  CreateLinkButton,
}: {
  CreateLinkButton: () => JSX.Element;
}) {
  const { viewMode, sortBy, showArchived } = useContext(LinksDisplayContext);

  const { folderId } = useCurrentFolderId();

  const { links, isValidating, error } = useLinks({
    sortBy,
    showArchived,
    folderId: folderId ?? "",
  });

  const { data: count } = useLinksCount<number>({
    query: {
      showArchived,
      folderId: folderId ?? "",
    },
  });

  return (
    <PageWidthWrapper className="grid gap-y-2">
      <LinksList
        CreateLinkButton={CreateLinkButton}
        links={links}
        count={count}
        loading={isValidating}
        error={error}
        compact={viewMode === "rows"}
      />
    </PageWidthWrapper>
  );
}

export const LinksListContext = createContext<{
  openMenuLinkId: string | null;
  setOpenMenuLinkId: Dispatch<SetStateAction<string | null>>;
}>({
  openMenuLinkId: null,
  setOpenMenuLinkId: () => {},
});

function LinksList({
  CreateLinkButton,
  links,
  count,
  loading,
  error,
  compact,
}: {
  CreateLinkButton: () => JSX.Element;
  links?: ResponseLink[];
  count?: number;
  loading?: boolean;
  error?: unknown;
  compact: boolean;
}) {
  const searchParams = useSearchParams();
  const { isMegaWorkspace } = useWorkspace();

  const [openMenuLinkId, setOpenMenuLinkId] = useState<string | null>(null);

  const isFiltered = [
    "folderId",
    "tagIds",
    "domain",
    "userId",
    "search",
    "showArchived",
  ].some((param) => searchParams.has(param));

  const errorMessage =
    error instanceof Error ? error.message : "Failed to load links";

  return (
    <LinksListContext.Provider value={{ openMenuLinkId, setOpenMenuLinkId }}>
      <LinkSelectionProvider links={links}>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : !links || links.length ? (
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
                ? "There are no links that match your filters. Adjust your filters to yield more results."
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
          <LinksToolbar
            loading={!!loading}
            links={links}
            linksCount={
              isMegaWorkspace ? Infinity : count ?? links?.length ?? 0
            }
          />
        )}
      </LinkSelectionProvider>
    </LinksListContext.Provider>
  );
}
