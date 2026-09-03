import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { applyGroupUtmToLink } from "@/lib/api/utm/apply-group-utm-to-link";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import {
  applyAppsFlyerParameters,
  loadAppsFlyerParameters,
} from "@/lib/integrations/appsflyer/apply-parameters";
import { AppsFlyerSettings } from "@/lib/integrations/appsflyer/schema";
import { isAppsFlyerTrackingUrl } from "@/lib/middleware/utils/is-appsflyer-tracking-url";
import { prisma } from "@/lib/prisma";
import { ProcessedLinkProps } from "@/lib/types";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { Link } from "@prisma/client";
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
          // Needed to re-index the owners after the URL changes below.
          programId: true,
          partnerId: true,
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
        owner: { programId: string | null; partnerId: string | null };
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
        const utmContext = {
          partnerName:
            defaultPartnerLink.partner?.name || defaultPartnerLink.key,
          partnerLinkKey: defaultPartnerLink.key,
        };

        const linkWithUtm = applyGroupUtmToLink({
          link: {
            domain: defaultPartnerLink.domain,
            key: defaultPartnerLink.key,
            url: defaultLink.url,
            projectId: defaultLink.program.workspaceId,
          } as ProcessedLinkProps,
          utmTemplate: group.utmTemplate,
          partnerName: defaultPartnerLink.partner?.name,
        });

        let url = linkWithUtm.url;

        // Inject AppsFlyer parameters with resolved macros
        if (
          appsFlyerParameters.length > 0 &&
          isAppsFlyerTrackingUrl(defaultLink.url)
        ) {
          url = applyAppsFlyerParameters({
            url,
            parameters: appsFlyerParameters,
            context: utmContext,
          });
        }

        linksToUpdate.push({
          id: defaultPartnerLink.id,
          owner: {
            programId: defaultPartnerLink.programId,
            partnerId: defaultPartnerLink.partnerId,
          },
          link: {
            url,
            utm_source: linkWithUtm.utm_source ?? null,
            utm_medium: linkWithUtm.utm_medium ?? null,
            utm_campaign: linkWithUtm.utm_campaign ?? null,
            utm_term: linkWithUtm.utm_term ?? null,
            utm_content: linkWithUtm.utm_content ?? null,
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
