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

export default function LinksContainer({
  AddEditLinkButton,
}: {
  AddEditLinkButton: () => JSX.Element;
}) {
  const router = useRouter();
  const { slug } = router.query as {
    slug: string;
  };

  const { project: { domain } = {} } = useProject();

  const { data: links } = useSWR<LinkProps[]>(
    domain
      ? `/api/projects/${slug}/domains/${domain}/links${getQueryString(router)}`
      : `/api/links${getQueryString(router)}`,
    fetcher,
    {
      // disable this because it keeps refreshing the state of the modal when its open
      revalidateOnFocus: false,
    },
  );

  return (
    <MaxWidthWrapper className="pb-10">
      <LinkFilters />
      <ul className="grid grid-cols-1 gap-3">
        {links ? (
          links.length > 0 ? (
            links.map((props) => <LinkCard key={props.key} props={props} />)
          ) : (
            <NoLinksPlaceholder AddEditLinkButton={AddEditLinkButton} />
          )
        ) : (
          Array.from({ length: 3 }).map((_, i) => (
            <LinkCardPlaceholder key={i} />
          ))
        )}
      </ul>
    </MaxWidthWrapper>
  );
}
