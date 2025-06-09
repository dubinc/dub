import { useState } from "react";
import { ReferralsEmbedCreateUpdateLink } from "./add-edit-link";
import { ReferralsEmbedLinksList } from "./links-list";
import { ReferralsEmbedLink } from "./types";

interface Props {
  links: ReferralsEmbedLink[];
  destinationDomain: string;
  shortLinkDomain: string;
}

export default function ReferralsEmbedLinks({
  links,
  destinationDomain,
  shortLinkDomain,
}: Props) {
  const [createLink, setCreateLink] = useState(false);
  const [link, setLink] = useState<ReferralsEmbedLink | null>(null);

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
