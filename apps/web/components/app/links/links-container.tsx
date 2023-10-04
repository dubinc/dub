import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import LinkCard from "./link-card";
import LinkCardPlaceholder from "./link-card-placeholder";
import LinkFilters from "./link-filters";
import NoLinksPlaceholder from "./no-links-placeholder";
import LinkSort from "./link-sort";
import useLinks from "#/lib/swr/use-links";
import { useLinkFiltersModal } from "../modals/link-filters-modal";
import LinkPagination from "./link-pagination";

export default function LinksContainer({
  AddEditLinkButton,
}: {
  AddEditLinkButton: () => JSX.Element;
}) {
  const { links } = useLinks();
  const { LinkFiltersButton, LinkFiltersModal } = useLinkFiltersModal();

  return (
    <>
      <LinkFiltersModal />
      <MaxWidthWrapper>
        <div className="my-5 flex h-10 w-full justify-center lg:justify-end">
          <LinkFiltersButton />
          <LinkSort />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-7">
          <div className="sticky top-32 col-span-2 hidden max-h-[calc(100vh-150px)] self-start overflow-auto rounded-lg border border-gray-100 bg-white shadow scrollbar-hide lg:block">
            <LinkFilters />
          </div>
          <div className="col-span-1 auto-rows-min grid-cols-1 lg:col-span-5">
            <ul className="grid min-h-[66.5vh] auto-rows-min gap-3">
              {links ? (
                links.length > 0 ? (
                  links.map((props) => (
                    <LinkCard key={props.id} props={props} />
                  ))
                ) : (
                  <NoLinksPlaceholder AddEditLinkButton={AddEditLinkButton} />
                )
              ) : (
                Array.from({ length: 5 }).map((_, i) => (
                  <LinkCardPlaceholder key={i} />
                ))
              )}
            </ul>
            {links && links.length > 0 && <LinkPagination />}
          </div>
        </div>
      </MaxWidthWrapper>
    </>
  );
}
