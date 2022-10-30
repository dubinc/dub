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
import { useMemo } from "react";

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

  const loading = useMemo(() => {
    if (slug) {
      // need to include `domain` because if not it flashes the "no links" placeholder
      return links && domain ? false : true;
    } else {
      return links ? false : true;
    }
  }, [links, domain, slug]);

  return (
    <MaxWidthWrapper className="pb-10">
      <LinkFilters />
      <ul className="grid grid-cols-1 gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <LinkCardPlaceholder key={i} />
          ))
        ) : links.length > 0 ? (
          links.map((props) => <LinkCard key={props.key} props={props} />)
        ) : (
          <NoLinksPlaceholder AddEditLinkButton={AddEditLinkButton} />
        )}
      </ul>
    </MaxWidthWrapper>
  );
}
