import { Prisma } from "@prisma/client";
import { unique } from "@dub/utils";
import { PartnerSearchDocument } from "./types";

export const partnerSearchDocumentSelect = {
  id: true,
  programId: true,
  partnerId: true,
  status: true,
  tenantId: true,
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
    country: partner.country,
    description: partner.description,
    platformTypes: unique(partner.platforms.map(({ type }) => type)),
    platformIdentifiers: unique(
      partner.platforms.map(({ identifier }) => identifier),
    ),
    linkKeys: unique(links.map(({ key }) => key)),
    status: enrollment.status,
    tenantId: enrollment.tenantId,
    groupId: enrollment.groupId,
    partnerTagIds: unique(
      partner.programPartnerTags
        .filter(({ programId }) => programId === enrollment.programId)
        .map(({ partnerTagId }) => partnerTagId),
    ),
  };
}
