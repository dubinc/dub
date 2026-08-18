import { Prisma } from "@prisma/client";
import { PartnerSearchDocument } from "./types";

export const partnerSearchDocumentSelect = {
  id: true,
  programId: true,
  partnerId: true,
  partner: {
    select: {
      name: true,
      email: true,
      companyName: true,
      description: true,
      platforms: {
        select: {
          type: true,
          identifier: true,
        },
      },
    },
  },
  links: {
    select: {
      domain: true,
      key: true,
      shortLink: true,
      url: true,
    },
  },
} satisfies Prisma.ProgramEnrollmentSelect;

export type PartnerSearchDocumentSource = Prisma.ProgramEnrollmentGetPayload<{
  select: typeof partnerSearchDocumentSelect;
}>;

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function serializePartnerSearchDocument(
  enrollment: PartnerSearchDocumentSource,
): PartnerSearchDocument {
  const { partner, links } = enrollment;

  return {
    id: enrollment.id,
    programId: enrollment.programId,
    partnerId: enrollment.partnerId,
    name: partner.name,
    email: partner.email,
    companyName: partner.companyName,
    description: partner.description,
    platformTypes: unique(partner.platforms.map(({ type }) => type)),
    platformIdentifiers: unique(
      partner.platforms.map(({ identifier }) => identifier),
    ),
    linkDomains: unique(links.map(({ domain }) => domain)),
    linkKeys: unique(links.map(({ key }) => key)),
    shortLinks: unique(links.map(({ shortLink }) => shortLink)),
    destinationUrls: unique(links.map(({ url }) => url)),
  };
}
