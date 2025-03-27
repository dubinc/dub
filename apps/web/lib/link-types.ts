import { LinkStructure } from "@dub/prisma/client";
import { getDomainWithoutWWW } from "@dub/utils";

export const linkTypes = ({
  domain,
  url,
}: {
  domain: string | null;
  url: string | null;
}) => {
  const shortDomain = domain || "refer.dub.co";
  const websiteDomain = (url && getDomainWithoutWWW(url)) || "dub.co";

  return [
    {
      id: LinkStructure.short,
      label: "Short link",
      example: `${shortDomain || "refer.dub.co"}/steven`,
      comingSoon: false,
    },
    {
      id: LinkStructure.query,
      label: "Query parameter",
      example: `${websiteDomain}?via=steven`,
      comingSoon: false,
    },
    {
      id: LinkStructure.dynamic,
      label: "Dynamic path",
      example: `${websiteDomain}/refer/steven`,
      comingSoon: true,
    },
  ];
};
