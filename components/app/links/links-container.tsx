import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import LinkCard from "./link-card";
import LinkCardPlaceholder from "./link-card-placeholder";
import LinkFilters from "./link-filters";
import NoLinksPlaceholder from "./no-links-placeholder";
import LinkSort from "./link-sort";
import useLinks from "@/lib/swr/use-links";
import { useLinkFiltersModal } from "../modals/link-filters-modal";

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
      <MaxWidthWrapper className="pb-10">
        <div className="my-5 flex w-full justify-center lg:justify-end">
          <LinkFiltersButton />
          <LinkSort />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-7">
          <div className="sticky top-32 col-span-2 hidden max-h-[calc(100vh-150px)] self-start overflow-scroll rounded-lg border border-gray-100 bg-white shadow lg:block">
            <LinkFilters />
          </div>
          <ul className="col-span-1 grid auto-rows-min grid-cols-1 gap-3 lg:col-span-5">
            {links ? (
              links.length > 0 ? (
                links.map((props) => <LinkCard key={props.id} props={props} />)
              ) : (
                <NoLinksPlaceholder AddEditLinkButton={AddEditLinkButton} />
              )
            ) : (
              Array.from({ length: 5 }).map((_, i) => (
                <LinkCardPlaceholder key={i} />
              ))
            )}
          </ul>
        </div>
      </MaxWidthWrapper>
    </>
  );
}
