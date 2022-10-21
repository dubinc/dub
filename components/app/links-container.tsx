import { useRouter } from "next/router";
import { useState } from "react";
import useSWR from "swr";
import LinkCard from "@/components/app/link-card";
import LinkCardPlaceholder from "@/components/app/link-card-placeholder";
import NoLinksPlaceholder from "@/components/app/no-links-placeholder";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import useProject from "@/lib/swr/use-project";
import { LinkProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";
import Switch from "../shared/switch";

export default function LinksContainer({
  AddEditLinkButton,
}: {
  AddEditLinkButton: () => JSX.Element;
}) {
  const router = useRouter();
  const { slug } = router.query as {
    slug: string;
  };

  const [hideArchived, setHideArchived] = useState(true);
  const queryString = `${hideArchived ? "" : "?archived=true"}`;

  const { project: { domain } = {} } = useProject();
  const { data: links } = useSWR<LinkProps[]>(
    domain
      ? `/api/projects/${slug}/domains/${domain}/links${queryString}`
      : `/api/links`,
    fetcher,
    {
      // disable this because it keeps refreshing the state of the modal when its open
      revalidateOnFocus: false,
    },
  );

  return (
    <MaxWidthWrapper>
      <div className="my-5 flex justify-end">
        <div className="bg-white p-3 rounded-lg shadow hover:shadow-md transition-all">
          <Switch fn={setHideArchived} />
        </div>
      </div>
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
