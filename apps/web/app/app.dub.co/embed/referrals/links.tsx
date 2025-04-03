import { Link } from "@dub/prisma/client";
import { ReferralsEmbedCreateLink } from "./create-link";
import { ReferralsEmbedLinksList } from "./links-list";

interface Props {
  links: Link[];
  destinationDomain: string;
  shortLinkDomain: string;
}

export default function ReferralsEmbedLinks({
  links,
  destinationDomain,
  shortLinkDomain,
}: Props) {
  return (
    <div className="flex flex-col space-y-6">
      <ReferralsEmbedCreateLink
        destinationDomain={destinationDomain}
        shortLinkDomain={shortLinkDomain}
      />
      <ReferralsEmbedLinksList links={links} />
    </div>
  );
}
