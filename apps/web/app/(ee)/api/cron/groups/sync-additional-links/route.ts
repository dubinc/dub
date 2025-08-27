import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { AdditionalPartnerLink } from "@/lib/types";
import { additionalPartnerLinkSchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { chunk, log } from "@dub/utils";
import { PartnerGroup } from "@prisma/client";
import { z } from "zod";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const payloadSchema = z.object({
  groupId: z.string(),
  updated: z.object({
    old: additionalPartnerLinkSchema,
    new: additionalPartnerLinkSchema,
  }),
});

// POST /api/cron/groups/sync-additional-links
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { groupId, updated } = payloadSchema.parse(JSON.parse(rawBody));

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

    await updateAdditionalLink({
      group,
      oldAdditionalLink: updated.old,
      newAdditionalLink: updated.new,
    });

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

async function updateAdditionalLink({
  group,
  oldAdditionalLink,
  newAdditionalLink,
}: {
  group: PartnerGroup;
  oldAdditionalLink: AdditionalPartnerLink;
  newAdditionalLink: AdditionalPartnerLink;
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

    // Find the links that match the oldAdditionalLink
    links = links.filter((link) => link.url === oldAdditionalLink.url);

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
              url: newAdditionalLink.url,
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
