"use client";

import { PartnerLinkStructure } from "@dub/prisma/client";
import { getDomainWithoutWWW } from "@dub/utils";

export const getPartnerLinkStructureOptions = ({
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
      label: "Short link",
      example: `${shortDomain}/{partnerName}`,
      comingSoon: false,
    },
    {
      id: PartnerLinkStructure.query,
      label: "Query parameter",
      example: `${websiteDomain}?via={partnerName}`,
      comingSoon: false,
    },
    {
      id: PartnerLinkStructure.path,
      label: "Dynamic path",
      example: `${websiteDomain}/refer/{partnerName}`,
      comingSoon: true,
    },
  ];
};
