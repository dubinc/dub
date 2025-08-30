import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  constructURLFromUTMParams,
  getParamsFromURL,
  getUrlWithoutUTMParams,
  isFulfilled,
  linkConstructorSimple,
  log,
} from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const MAX_BATCH = 10;

const schema = z.object({
  defaultLinkId: z.string(),
  cursor: z.string().optional(),
});

// POST /api/cron/groups/update-default-links
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { defaultLinkId, cursor } = schema.parse(JSON.parse(rawBody));

    // Find the default link
    const defaultLink = await prisma.partnerGroupDefaultLink.findUnique({
      where: {
        id: defaultLinkId,
      },
    });

    if (!defaultLink) {
      return logAndRespond(
        `Default link ${defaultLinkId} not found. Skipping...`,
        {
          logLevel: "error",
        },
      );
    }

    // Find the group
    const group = await prisma.partnerGroup.findUnique({
      where: {
        id: defaultLink.groupId,
      },
    });

    if (!group) {
      return logAndRespond(
        `Group ${defaultLink.groupId} not found. Skipping...`,
        {
          logLevel: "error",
        },
      );
    }

    console.info(
      `Updating default links for the partners (defaultLinkId=${defaultLink.id}, groupId=${group.id}).`,
    );

    // Find the workspace & program
    const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
      where: {
        id: group.programId,
      },
      include: {
        workspace: true,
      },
    });

    let hasMore = true;
    let currentCursor = cursor;
    let processedBatches = 0;

    while (processedBatches < MAX_BATCH) {
      const links = await prisma.link.findMany({
        where: {
          ...(currentCursor && {
            id: {
              gt: currentCursor,
            },
          }),
          partnerGroupDefaultLinkId: defaultLink.id,
        },
        take: PAGE_SIZE,
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          url: true,
          key: true,
          domain: true,
          shortLink: true,
          utm_source: true,
          utm_medium: true,
          utm_campaign: true,
          utm_term: true,
          utm_content: true,
        },
      });

      if (links.length === 0) {
        hasMore = false;
        break;
      }

      // Process the links
      const processedLinks = links.map((link) => {
        const url = getUrlWithoutUTMParams(link.url);
        const domainChanged = link.domain !== defaultLink.domain;

        return {
          id: link.id,
          url:
            url !== defaultLink.url
              ? constructURLFromUTMParams(
                  defaultLink.url,
                  getParamsFromURL(link.url),
                )
              : undefined,
          domain: domainChanged ? defaultLink.domain : undefined,
          shortLink: domainChanged
            ? linkConstructorSimple({
                domain: defaultLink.domain,
                key: link.key,
              })
            : undefined,
        };
      });

      // Update the links
      const updatedLinksPromises = await Promise.allSettled(
        processedLinks.map((link) =>
          prisma.link.update({
            where: {
              id: link.id,
            },
            data: {
              url: link.url,
              domain: link.domain,
              shortLink: link.shortLink,
            },
            select: {
              domain: true,
              key: true,
            },
          }),
        ),
      );

      const updatedLinks = updatedLinksPromises
        .filter(isFulfilled)
        .map((link) => link.value);

      await linkCache.expireMany(updatedLinks);

      // Update cursor to the last processed record
      currentCursor = links[links.length - 1].id;
      processedBatches++;
    }

    if (hasMore) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/update-default-links`,
        method: "POST",
        body: {
          defaultLinkId,
          cursor: currentCursor,
        },
      });
    }

    return logAndRespond(`Finished updating default links for the partners.`);
  } catch (error) {
    await log({
      message: `Error updating default links for the partners: ${error.message}.`,
      type: "errors",
    });

    console.error(error);

    return handleAndReturnErrorResponse(error);
  }
}
