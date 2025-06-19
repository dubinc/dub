"use client";

import { LinkStructure } from "@dub/prisma/client";
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
      id: LinkStructure.short,
      label: "Short link",
      example: `${shortDomain}/{partnerName}`,
      comingSoon: false,
    },
    {
      id: LinkStructure.query,
      label: "Query parameter",
      example: `${websiteDomain}?via={partnerName}`,
      comingSoon: false,
    },
    {
      id: LinkStructure.path,
      label: "Dynamic path",
      example: `${websiteDomain}/refer/{partnerName}`,
      comingSoon: true,
    },
  ];
};
