import { Prisma } from "@prisma/client";
import { PartnerSearchDocument } from "./types";

export const partnerSearchDocumentSelect = {
  id: true,
  programId: true,
  partnerId: true,
  status: true,
  groupId: true,
  createdAt: true,
  updatedAt: true,
  partner: {
    select: {
      name: true,
      email: true,
      companyName: true,
      description: true,
      country: true,
      updatedAt: true,
      platforms: {
        select: {
          type: true,
          identifier: true,
          updatedAt: true,
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
      updatedAt: true,
    },
  },
} satisfies Prisma.ProgramEnrollmentSelect;

export type PartnerSearchDocumentSource = Prisma.ProgramEnrollmentGetPayload<{
  select: typeof partnerSearchDocumentSelect;
}>;

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function getDocumentUpdatedAt(enrollment: PartnerSearchDocumentSource): string {
  const timestamps = [
    enrollment.updatedAt,
    enrollment.partner.updatedAt,
    ...enrollment.partner.platforms.map(({ updatedAt }) => updatedAt),
    ...enrollment.links.map(({ updatedAt }) => updatedAt),
  ];

  return new Date(
    Math.max(...timestamps.map((timestamp) => timestamp.getTime())),
  ).toISOString();
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
    status: enrollment.status,
    groupId: enrollment.groupId,
    country: partner.country,
    createdAt: enrollment.createdAt.toISOString(),
    updatedAt: getDocumentUpdatedAt(enrollment),
  };
}
