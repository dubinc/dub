import { useRouter } from "next/router";
import useSWR from "swr";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import useProject from "@/lib/swr/use-project";
import { LinkProps } from "@/lib/types";
import { fetcher, getQueryString } from "@/lib/utils";
import LinkCard from "./link-card";
import LinkCardPlaceholder from "./link-card-placeholder";
import LinkFilters from "./link-filters";
import NoLinksPlaceholder from "./no-links-placeholder";
import LinkSort from "./link-sort";
import useLinks from "@/lib/swr/use-links";
import IconMenu from "@/components/shared/icon-menu";
import { ChevronDown, Filter } from "lucide-react";

export default function LinksContainer({
  AddEditLinkButton,
}: {
  AddEditLinkButton: () => JSX.Element;
}) {
  const { links, loading } = useLinks();

  return (
    <MaxWidthWrapper className="pb-10">
      <div className="my-5 flex w-full justify-center lg:justify-end">
        <button className="mr-5 flex flex-1 items-center justify-between space-x-2 rounded-md bg-white px-3 py-2.5 shadow transition-all duration-75 hover:shadow-md active:scale-95 lg:hidden">
          <IconMenu
            text="Filters"
            icon={<Filter className="h-4 w-4 shrink-0" />}
          />
          <ChevronDown
            className={`h-5 w-5 text-gray-400 ${
              true ? "rotate-180 transform" : ""
            } transition-all duration-75`}
          />
        </button>
        <LinkSort />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-7">
        <div className="sticky top-32 col-span-2 hidden max-h-[500px] self-start rounded-lg border border-gray-100 bg-white shadow lg:block">
          <LinkFilters />
        </div>
        <ul className="col-span-1 grid auto-rows-min grid-cols-1 gap-3 lg:col-span-5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <LinkCardPlaceholder key={i} />
            ))
          ) : links.length > 0 ? (
            links.map((props) => <LinkCard key={props.id} props={props} />)
          ) : (
            <NoLinksPlaceholder AddEditLinkButton={AddEditLinkButton} />
          )}
        </ul>
      </div>
    </MaxWidthWrapper>
  );
}
