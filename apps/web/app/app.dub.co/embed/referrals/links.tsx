import { Link } from "@dub/prisma/client";
import { useState } from "react";
import { ReferralsEmbedCreateUpdateLink } from "./create-update-link";
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
  const [createLink, setCreateLink] = useState(false);
  const [link, setLink] = useState<Link | null>(null);

  return (
    <div className="flex flex-col space-y-6">
      {createLink ? (
        <ReferralsEmbedCreateUpdateLink
          destinationDomain={destinationDomain}
          shortLinkDomain={shortLinkDomain}
          link={link}
          onCancel={() => {
            setCreateLink(false);
            setLink(null);
          }}
        />
      ) : (
        <ReferralsEmbedLinksList
          links={links}
          onCreateLink={() => setCreateLink(true)}
          onEditLink={(link) => {
            setLink(link);
            setCreateLink(true);
          }}
        />
      )}
    </div>
  );
}
