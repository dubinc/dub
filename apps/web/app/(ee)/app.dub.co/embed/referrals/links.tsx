import { PartnerGroup, Program } from "@prisma/client";
import { useState } from "react";
import { ReferralsEmbedCreateUpdateLink } from "./add-edit-link";
import { ReferralsEmbedLinksList } from "./links-list";
import { ReferralsEmbedLink } from "./types";

interface Props {
  links: ReferralsEmbedLink[];
  program: Pick<
    Program,
    "domain" | "url" | "urlValidationMode" | "maxPartnerLinks"
  >;
  group: Pick<PartnerGroup, "id" | "additionalLinks" | "maxPartnerLinks">;
}

export default function ReferralsEmbedLinks({ links, program, group }: Props) {
  const [createLink, setCreateLink] = useState(false);
  const [link, setLink] = useState<ReferralsEmbedLink | null>(null);

  return (
    <div className="flex flex-col space-y-6">
      {createLink ? (
        <ReferralsEmbedCreateUpdateLink
          program={program}
          link={link}
          onCancel={() => {
            setCreateLink(false);
            setLink(null);
          }}
        />
      ) : (
        <ReferralsEmbedLinksList
          links={links}
          group={group}
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
