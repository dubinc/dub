import { useRouter } from "next/router";
import useSWR from "swr";
import LinkCard from "@/components/app/link-card";
import LinkCardPlaceholder from "@/components/app/link-card-placeholder";
import NoLinksPlaceholder from "@/components/app/no-links-placeholder";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import useProject from "@/lib/swr/use-project";
import { LinkProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";

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
    domain ? `/api/projects/${slug}/domains/${domain}/links` : `/api/links`,
    fetcher,
  );

  return (
    <MaxWidthWrapper>
      <ul className="py-10 grid grid-cols-1 gap-3">
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
