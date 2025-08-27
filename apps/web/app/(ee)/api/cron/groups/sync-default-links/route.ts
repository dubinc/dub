import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkCreateLinks } from "@/lib/api/links";
import { linkCache } from "@/lib/api/links/cache";
import { generatePartnerLink } from "@/lib/api/partners/create-partner-link";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { DefaultPartnerLink, WorkspaceProps } from "@/lib/types";
import { defaultPartnerLinkSchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { chunk, isFulfilled, linkConstructorSimple, log } from "@dub/utils";
import { Link, PartnerGroup } from "@prisma/client";
import { z } from "zod";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const payloadSchema = z.object({
  groupId: z.string(),
  userId: z.string(),
  added: defaultPartnerLinkSchema.nullable(),
  updated: z
    .object({
      old: defaultPartnerLinkSchema,
      new: defaultPartnerLinkSchema,
    })
    .nullable(),
});

// POST /api/cron/groups/sync-default-links
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { groupId, userId, added, updated } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

    // Find the group
    const group = await prisma.partnerGroup.findUnique({
      where: {
        id: groupId,
      },
    });

    if (!group) {
      return logAndRespond(`Group ${groupId} not found. Skipping...`, {
        logLevel: "error",
      });
    }

    // New default link has been added
    if (added) {
      await createDefaultLink({
        group,
        defaultLink: added,
        userId,
      });
    }
    // Existing default link has been updated
    else if (updated) {
      await updateDefaultLink({
        group,
        oldDefaultLink: updated.old,
        newDefaultLink: updated.new,
        userId,
      });
    } else {
      return logAndRespond("No default link changes detected. Skipping...");
    }

    return logAndRespond(`Synced default links for group ${groupId}.`);
  } catch (error) {
    await log({
      message: `Error handling "groups/sync-default-links" ${error.message}.`,
      type: "errors",
    });

    console.error(error);

    return handleAndReturnErrorResponse(error);
  }
}

// Create a new default link for each partner in the group
async function createDefaultLink({
  group,
  defaultLink,
  userId,
}: {
  group: PartnerGroup;
  defaultLink: DefaultPartnerLink;
  userId: string;
}) {
  const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
    where: {
      id: group.programId,
    },
    include: {
      workspace: true,
    },
  });

  let currentPage = 0;

  while (true) {
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: group.id,
      },
      include: {
        partner: true,
      },
      skip: currentPage * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (programEnrollments.length === 0) {
      break;
    }

    currentPage = currentPage + 1;

    const processedLinks = (
      await Promise.allSettled(
        programEnrollments.map(({ partner, ...programEnrollment }) =>
          generatePartnerLink({
            workspace: {
              id: workspace.id,
              plan: workspace.plan as WorkspaceProps["plan"],
              webhookEnabled: workspace.webhookEnabled,
            },
            program: {
              id: program.id,
              defaultFolderId: program.defaultFolderId,
            },
            partner: {
              id: partner.id,
              name: partner.name,
              email: partner.email!,
              tenantId: programEnrollment.tenantId ?? undefined,
            },
            link: {
              domain: defaultLink.domain,
              url: defaultLink.url,
              tenantId: programEnrollment.tenantId ?? undefined,
            },
            userId,
          }),
        ),
      )
    )
      .filter(isFulfilled)
      .map(({ value }) => value);

    await bulkCreateLinks({
      links: processedLinks,
    });
  }
}

// Update the default link for each partner in the group
async function updateDefaultLink({
  group,
  oldDefaultLink,
  newDefaultLink,
  userId,
}: {
  group: PartnerGroup;
  oldDefaultLink: DefaultPartnerLink;
  newDefaultLink: DefaultPartnerLink;
  userId: string;
}) {
  let currentPage = 0;

  while (true) {
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: group.id,
      },
      include: {
        partner: true,
        links: {
          orderBy: {
            id: "asc",
          },
        },
      },
      skip: currentPage * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (programEnrollments.length === 0) {
      break;
    }

    currentPage = currentPage + 1;

    let links = programEnrollments.flatMap(({ links }) => links);

    // Find the links that match the OldDefaultLink
    const defaultLinks = links.filter(
      (link) =>
        link.domain === oldDefaultLink.domain &&
        link.url === oldDefaultLink.url,
    );

    const partnerLinkMap = new Map<string, Link>();

    // Take the first matching link from each partner
    // Because we assume the first matching link is the default link
    for (const defaultLink of defaultLinks) {
      if (!defaultLink.partnerId) {
        continue;
      }

      if (!partnerLinkMap.has(defaultLink.partnerId)) {
        partnerLinkMap.set(defaultLink.partnerId, defaultLink);
      }
    }

    links = Array.from(partnerLinkMap.values());

    // Split this into chunks of 100 links
    const linkChunks = chunk(links, 100);

    // Update the UTM for each partner links in the group
    for (const linkChunk of linkChunks) {
      const updatedLinks = await Promise.all(
        linkChunk.map((link) =>
          prisma.link.update({
            where: {
              id: link.id,
            },
            data: {
              url: newDefaultLink.url,
              domain: newDefaultLink.domain,
              shortLink: linkConstructorSimple({
                domain: newDefaultLink.domain,
                key: link.key,
              }),
            },
          }),
        ),
      );

      await Promise.allSettled([
        recordLink(updatedLinks),
        linkCache.expireMany(updatedLinks),
      ]);
    }
  }
}
