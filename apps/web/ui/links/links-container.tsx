"use client";

import useLinks from "@/lib/swr/use-links";
import useLinksCount from "@/lib/swr/use-links-count";
import { MaxWidthWrapper } from "@dub/ui";
import { Suspense } from "react";
import LinkCard from "./link-card";
import LinkCardPlaceholder from "./link-card-placeholder";
import LinkPagination from "./link-pagination";
import NoLinksPlaceholder from "./no-links-placeholder";

export default function LinksContainer({
  AddEditLinkButton,
}: {
  AddEditLinkButton: () => JSX.Element;
}) {
  const { links, isValidating } = useLinks();
  const { data: count } = useLinksCount();

  return (
    <MaxWidthWrapper className="grid gap-y-2">
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
    </MaxWidthWrapper>
  );
}
