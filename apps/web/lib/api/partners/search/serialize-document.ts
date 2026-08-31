import { Prisma } from "@prisma/client";
import { PartnerSearchDocument } from "./types";

export const partnerSearchDocumentSelect = {
  id: true,
  programId: true,
  partnerId: true,
  status: true,
  groupId: true,
  partner: {
    select: {
      name: true,
      email: true,
      companyName: true,
      description: true,
      country: true,
      // Tags are per (program, partner) and this select cannot take a program,
      // so the serializer narrows them to the enrollment's own program.
      programPartnerTags: {
        select: {
          programId: true,
          partnerTagId: true,
        },
      },
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
      key: true,
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
    linkKeys: unique(links.map(({ key }) => key)),
    status: enrollment.status,
    groupId: enrollment.groupId,
    country: partner.country,
    partnerTagIds: unique(
      partner.programPartnerTags
        .filter(({ programId }) => programId === enrollment.programId)
        .map(({ partnerTagId }) => partnerTagId),
    ),
  };
}
