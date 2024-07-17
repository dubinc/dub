"use client";

import useLinks from "@/lib/swr/use-links";
import useLinksCount from "@/lib/swr/use-links-count";
import { LinkWithTagsProps, UserProps } from "@/lib/types";
import { CardList, MaxWidthWrapper, useRouterStuff } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import { Dispatch, SetStateAction, createContext, useState } from "react";
import { LinkCard } from "./link-card";
import LinkCardPlaceholder from "./link-card-placeholder";
import LinkNotFound from "./link-not-found";
import NoLinksPlaceholder from "./no-links-placeholder";

export const linkViewModes = ["cards", "rows"] as const;
export type LinksViewMode = (typeof linkViewModes)[number];

export type ResponseLink = LinkWithTagsProps & {
  user: UserProps;
};

export default function LinksContainer({
  AddEditLinkButton,
  viewMode,
}: {
  AddEditLinkButton: () => JSX.Element;
  viewMode: LinksViewMode;
}) {
  const { links, isValidating } = useLinks();
  const { data: count } = useLinksCount();

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
}>({
  openMenuLinkId: null,
  setOpenMenuLinkId: () => {},
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
  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();
  const page = (parseInt(searchParams?.get("page") || "1") || 1) - 1;

  const [openMenuLinkId, setOpenMenuLinkId] = useState<string | null>(null);

  const isFiltered = [
    "domain",
    "tagId",
    "userId",
    "search",
    "showArchived",
  ].some((param) => searchParams.has(param));

  return loading || links?.length ? (
    <LinksListContext.Provider value={{ openMenuLinkId, setOpenMenuLinkId }}>
      {/* Cards */}
      <CardList variant={compact ? "compact" : "loose"} loading={loading}>
        {links?.length
          ? // Link cards
            links.map((link) => <LinkCard link={link} />)
          : // Loading placeholder cards
            Array.from({ length: 6 }).map((_, idx) => (
              <CardList.Card key={idx} innerClassName="flex items-center gap-4">
                <LinkCardPlaceholder />
              </CardList.Card>
            ))}
      </CardList>

      {/* Pagination */}
      {!!links?.length && (
        <CardList.Pagination
          page={page}
          onPageChange={(p) => {
            const newPage = p(page);
            queryParams(
              newPage === 0
                ? { del: "page" }
                : {
                    set: {
                      page: (newPage + 1).toString(),
                    },
                  },
            );
          }}
          totalCount={count ?? links.length}
        />
      )}
    </LinksListContext.Provider>
  ) : isFiltered ? (
    <LinkNotFound />
  ) : (
    <NoLinksPlaceholder AddEditLinkButton={AddEditLinkButton} />
  );
}
