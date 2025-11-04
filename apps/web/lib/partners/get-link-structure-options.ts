"use client";

import { PartnerLinkStructure } from "@dub/prisma/client";
import { getDomainWithoutWWW } from "@dub/utils";

export const getLinkStructureOptions = ({
  domain,
  url,
}: {
  domain?: string | null;
  url?: string | null;
}) => {
  const shortDomain = domain || "refer.dub.co";
  const websiteDomain = (url && getDomainWithoutWWW(url)) || "dub.co";

  return [
    {
      id: PartnerLinkStructure.short,
      label: "Short Link",
      example: `${shortDomain}/{partner-link-key}`,
      recommended: true,
    },
    {
      id: PartnerLinkStructure.query,
      label: "Query Parameter",
      example: `${websiteDomain}?via={partner-link-key}`,
    },
    // {
    //   id: PartnerLinkStructure.path,
    //   label: "Dynamic path",
    //   example: `${websiteDomain}/refer/{partner-link-key}`,
    // },
  ];
};
