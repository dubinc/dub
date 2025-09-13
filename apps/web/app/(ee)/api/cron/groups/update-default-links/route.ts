import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { processLink } from "@/lib/api/links";
import { linkCache } from "@/lib/api/links/cache";
import { includeTags } from "@/lib/api/links/include-tags";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
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

/**
 * Cron job to update existing partner links when a group's default link configuration changes.
 *
 * For each link associated with a default link, it updates the domain and URL
 * to match the new default link configuration while preserving UTM parameters.
 *
 * It processes up to MAX_BATCH * PAGE_SIZE links per execution
 * and schedules additional jobs if needed.
 */

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
      include: {
        program: true,
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
      });

      if (links.length === 0) {
        hasMore = false;
        break;
      }

      // Process the links
      const processedLinks = await Promise.all(
        links.map((link) => {
          const skipKeyChecks =
            link.domain.toLowerCase() === defaultLink.domain.toLowerCase();

          return processLink({
            // @ts-expect-error
            payload: {
              ...link,
              domain: defaultLink.domain,
              url: defaultLink.url,
            },
            workspace: {
              id: group.program.workspaceId,
              plan: "business",
            },
            skipKeyChecks,
            skipFolderChecks: true,
            skipProgramChecks: true,
            skipExternalIdChecks: true,
          });
        }),
      );

      const validLinks = processedLinks
        .filter(({ error }) => error == null)
        .map(({ link }) => link);

      const errorLinks = processedLinks
        .filter(({ error }) => error != null)
        .map(({ link: { domain, key }, error }) => ({
          domain,
          key,
          error,
        }));

      // Bulk update the links
      if (validLinks.length > 0) {
        const updatedLinkPromises = await Promise.allSettled(
          validLinks.map((link) =>
            prisma.link.update({
              where: {
                id: link.id,
              },
              // @ts-expect-error
              data: {
                ...link,
                shortLink: linkConstructorSimple({
                  domain: defaultLink.domain,
                  key: link.key,
                }),
              },
              include: includeTags,
            }),
          ),
        );

        const updatedLinks = updatedLinkPromises
          .filter(isFulfilled)
          .map(({ value }) => value);

        await linkCache.expireMany(validLinks);
      }

      if (errorLinks.length > 0) {
        console.error(errorLinks);
        console.log(`Failed to update ${errorLinks.length} links.`);
      }

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
