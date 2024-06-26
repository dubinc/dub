"use client";

import useLinks from "@/lib/swr/use-links";
import useLinksCount from "@/lib/swr/use-links-count";
import { Filter, MaxWidthWrapper } from "@dub/ui";
import { Suspense, useRef } from "react";
import { useLinkFiltersModal } from "../modals/link-filters-modal";
import LinkCard from "./link-card";
import LinkCardPlaceholder from "./link-card-placeholder";
import { SearchBox } from "./link-filters";
import LinkPagination from "./link-pagination";
import LinkSort from "./link-sort";
import NoLinksPlaceholder from "./no-links-placeholder";
import { useLinkFilters } from "./use-link-filters";

export default function LinksContainer({
  AddEditLinkButton,
}: {
  AddEditLinkButton: () => JSX.Element;
}) {
  const { links, isValidating } = useLinks();
  const { data: count } = useLinksCount();
  const { LinkFiltersButton, LinkFiltersModal } = useLinkFiltersModal();
  const searchInputRef = useRef();

  const { filters, activeFilters, onSelect, onRemove, onRemoveAll } =
    useLinkFilters();

  return (
    <>
      <LinkFiltersModal />
      <MaxWidthWrapper className="flex flex-col space-y-3 pb-3">
        <div className="flex grow items-center justify-start gap-2">
          <div className="w-72 max-w-full">
            <SearchBox searchInputRef={searchInputRef} />
          </div>
          <div className="shrink-0">
            <Filter.Select
              filters={filters}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          </div>
          <div className="grow-0">
            <Suspense>
              <LinkSort />
            </Suspense>
          </div>
        </div>
        <div>
          <Filter.List
            filters={filters}
            activeFilters={activeFilters}
            onRemove={onRemove}
            onRemoveAll={onRemoveAll}
          />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="col-span-1 auto-rows-min grid-cols-1 lg:col-span-5">
            <ul className="grid min-h-[66.5vh] auto-rows-min gap-3">
              {links && !isValidating ? (
                links.length > 0 ? (
                  links.map((props) => (
                    <Suspense key={props.id} fallback={<LinkCardPlaceholder />}>
                      <LinkCard props={props} />
                    </Suspense>
                  ))
                ) : (
                  <NoLinksPlaceholder AddEditLinkButton={AddEditLinkButton} />
                )
              ) : (
                Array.from({ length: 10 }).map((_, i) => (
                  <LinkCardPlaceholder key={i} />
                ))
              )}
            </ul>
            {count && count > 0 ? (
              <Suspense>
                <LinkPagination />
              </Suspense>
            ) : null}
          </div>
        </div>
      </MaxWidthWrapper>
    </>
  );
}
