import { Link, Partner, PartnerGroupDefaultLink } from "@dub/prisma/client";

// Add a new method that update the partner group default links when their group changes
export function remapPartnerGroupDefaultLinks({
  partner,
  links,
  newGroup,
}: {
  partner: Pick<Partner, "id">;
  links: Pick<Link, "id" | "url" | "partnerGroupDefaultLinkId">[];
  newGroup: {
    defaultLinks: Pick<PartnerGroupDefaultLink, "id" | "domain" | "url">[];
  };
}) {
  // 1. Remap existing links (wrap around if fewer new defaults)
  const linksToUpdate = links.map((link, index) => {
    const targetDefault =
      newGroup.defaultLinks[index % newGroup.defaultLinks.length];

    return {
      id: link.id,
      partnerGroupDefaultLinkId: targetDefault.id,
      url: targetDefault.url,
    };
  });

  // 2. Create extra links if new group has more defaults
  const linksToCreate =
    newGroup.defaultLinks.length > links.length
      ? newGroup.defaultLinks.slice(links.length).map((targetDefault) => ({
          partnerId: partner.id,
          partnerGroupDefaultLinkId: targetDefault.id,
          domain: targetDefault.domain,
          url: targetDefault.url,
        }))
      : [];

  return {
    linksToCreate,
    linksToUpdate,
  };
}
