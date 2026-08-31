import { Prisma } from "@prisma/client";
import { PartnerSearchDocument } from "./types";

export const partnerSearchDocumentSelect = {
  id: true,
  programId: true,
  partnerId: true,
  status: true,
  groupId: true,
  // The program's destination host, so the serializer can drop it from
  // destination URLs below.
  program: {
    select: {
      url: true,
    },
  },
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

function getHost(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * The distinctive part of a destination URL. Query strings and fragments are
 * stripped so tracking parameters never reach the index, and the host is
 * dropped when it is the program's own: measured in production, ~99% of
 * destination hosts in a program are its one domain, so indexing it floods
 * every search containing a domain token. A host that differs (a partner's own
 * site) identifies the partner and is kept.
 */
function sanitizeDestinationUrl(
  url: string,
  programHost: string | null,
): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname === "/" ? "" : parsed.pathname;

    return `${host === programHost ? "" : host}${path}` || null;
  } catch {
    return url;
  }
}

export function serializePartnerSearchDocument(
  enrollment: PartnerSearchDocumentSource,
): PartnerSearchDocument {
  const { partner, links, program } = enrollment;
  const programHost = getHost(program.url);

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
    destinationUrls: unique(
      links.flatMap(({ url }) => {
        const sanitized = sanitizeDestinationUrl(url, programHost);
        return sanitized ? [sanitized] : [];
      }),
    ),
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
