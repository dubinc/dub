import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { extractUtmParams } from "@/lib/api/utm/extract-utm-params";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import {
  applyAppsFlyerParameters,
  loadAppsFlyerParameters,
} from "@/lib/integrations/appsflyer/apply-parameters";
import { AppsFlyerSettings } from "@/lib/integrations/appsflyer/schema";
import { isAppsFlyerTrackingUrl } from "@/lib/middleware/utils/is-appsflyer-tracking-url";
import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import {
  APP_DOMAIN_WITH_NGROK,
  constructURLFromUTMParams,
  log,
} from "@dub/utils";
import * as z from "zod/v4";
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
      include: {
        partnerGroup: {
          include: {
            utmTemplate: true,
          },
        },
        program: {
          select: {
            workspaceId: true,
          },
        },
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

    const group = defaultLink.partnerGroup;

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

    // Load AppsFlyer parameters if the default link is an AppsFlyer URL
    let appsFlyerParameters: AppsFlyerSettings["parameters"] = [];

    if (isAppsFlyerTrackingUrl(defaultLink.url)) {
      appsFlyerParameters = await loadAppsFlyerParameters(
        defaultLink.program.workspaceId,
      );
    }

    let hasMore = true;
    let currentCursor = cursor;
    let processedBatches = 0;

    while (processedBatches < MAX_BATCH) {
      const defaultPartnerLinks = await prisma.link.findMany({
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
          domain: true,
          key: true,
          partner: {
            select: {
              name: true,
            },
          },
        },
      });

      if (defaultPartnerLinks.length === 0) {
        hasMore = false;
        break;
      }

      const linksToUpdate: {
        id: string;
        link: Pick<
          Link,
          | "url"
          | "utm_source"
          | "utm_medium"
          | "utm_campaign"
          | "utm_term"
          | "utm_content"
        >;
      }[] = [];

      for (const defaultPartnerLink of defaultPartnerLinks) {
        let url = constructURLFromUTMParams(
          defaultLink.url,
          extractUtmParams(group.utmTemplate),
        );

        // Inject AppsFlyer parameters with resolved macros
        if (
          appsFlyerParameters.length > 0 &&
          isAppsFlyerTrackingUrl(defaultLink.url)
        ) {
          url = applyAppsFlyerParameters({
            url,
            parameters: appsFlyerParameters,
            context: {
              partnerName: defaultPartnerLink.partner?.name,
              partnerLinkKey: defaultPartnerLink.key,
            },
          });
        }

        linksToUpdate.push({
          id: defaultPartnerLink.id,
          link: {
            url,
            ...extractUtmParams(group.utmTemplate, { excludeRef: true }),
          },
        });
      }

      if (linksToUpdate.length > 0) {
        await Promise.allSettled(
          linksToUpdate.map(({ id, link }) =>
            prisma.link.update({
              where: {
                id,
              },
              data: link,
            }),
          ),
        );
      }

      console.log(
        `Updated ${linksToUpdate.length} links with url=${defaultLink.url} (via defaultLinkId=${defaultLink.id})`,
      );

      await linkCache.expireMany(defaultPartnerLinks);

      // Update cursor to the last processed record
      currentCursor = defaultPartnerLinks[defaultPartnerLinks.length - 1].id;
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

    return handleAndReturnErrorResponse(error);
  }
}
