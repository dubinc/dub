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

  const handleEditLink = (link: Link) => {
    console.log("Edit link:", link);
  };

  return (
    <div className="flex flex-col space-y-6">
      {createLink ? (
        <ReferralsEmbedCreateUpdateLink
          destinationDomain={destinationDomain}
          shortLinkDomain={shortLinkDomain}
          onCancel={() => setCreateLink(false)}
        />
      ) : (
        <ReferralsEmbedLinksList
          links={links}
          onEditLink={handleEditLink}
          onCreateLink={() => setCreateLink(true)}
        />
      )}
    </div>
  );
}
