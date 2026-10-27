import { useState } from "react";
import { ReferralsEmbedCreateUpdateLink } from "./add-edit-link";
import { ReferralsEmbedLinksList } from "./links-list";
import { ReferralsEmbedLink } from "./types";

export function ReferralsEmbedLinks() {
  const [createLink, setCreateLink] = useState(false);
  const [link, setLink] = useState<ReferralsEmbedLink | null>(null);

  return (
    <div className="flex flex-col space-y-6">
      {createLink ? (
        <ReferralsEmbedCreateUpdateLink
          link={link}
          onCancel={() => {
            setCreateLink(false);
            setLink(null);
          }}
        />
      ) : (
        <ReferralsEmbedLinksList
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
