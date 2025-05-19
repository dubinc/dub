"use client";

import { LinkStructure } from "@dub/prisma/client";
import { getDomainWithoutWWW } from "@dub/utils";
import { useSession } from "next-auth/react";

export const getLinkStructureOptions = ({
  domain,
  url,
}: {
  domain?: string | null;
  url?: string | null;
}) => {
  const { data: session } = useSession();
  const username =
    session?.user?.name?.split(" ")[0].toLowerCase() ??
    session?.user?.email?.split("@")[0] ??
    "steven";
  const shortDomain = domain || "refer.dub.co";
  const websiteDomain = (url && getDomainWithoutWWW(url)) || "dub.co";

  return [
    {
      id: LinkStructure.short,
      label: "Short link",
      example: `${shortDomain}/${username}`,
      comingSoon: false,
    },
    {
      id: LinkStructure.query,
      label: "Query parameter",
      example: `${websiteDomain}?via=${username}`,
      comingSoon: false,
    },
    {
      id: LinkStructure.path,
      label: "Dynamic path",
      example: `${websiteDomain}/refer/${username}`,
      comingSoon: true,
    },
  ];
};
