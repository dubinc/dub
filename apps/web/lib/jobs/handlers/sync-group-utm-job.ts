import { linkCache } from "@/lib/api/links/cache";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { extractAndResolveUtmParams } from "@/lib/api/utm/extract-and-resolve-utm-params";
import { prisma } from "@/lib/prisma";
import { LinkProps } from "@/lib/types";
import { chunk, constructURLFromUTMParams } from "@dub/utils";
import * as z from "zod/v4";
import { defineJob } from "../index";

const PAGE_SIZE = 50;
const UPDATE_BATCH_SIZE = 25;

const inputSchema = z.object({
  groupId: z.string(),
  partnerIds: z.array(z.string()).optional(),
  startAfterProgramEnrollmentId: z.string().optional(),
});

/**
  Syncs the UTM parameter settings for a given group (whether there is a UTM template or not)

  This job is triggered when:
  1. a UTM template is created for a group
  2. a UTM template is updated
  3. in groups/remap-default-links cron
  4. a partner's name changes (via dispatchGroupUtmSyncForPartner)
 */
export const syncGroupUtmJob = defineJob({
  name: "sync-group-utm-job",
  schema: inputSchema,
  async handle(input) {
    let { groupId, partnerIds, startAfterProgramEnrollmentId } = input;

    // Find the UTM template
    const group = await prisma.partnerGroup.findUnique({
      where: {
        id: groupId,
      },
      select: {
        id: true,
        name: true,
        utmTemplate: true,
      },
    });

    if (!group) {
      console.error(
        `[syncGroupUtmJob] Group ${groupId} not found. Skipping...`,
      );
      return;
    }

    const { utmTemplate } = group;

    // Find partners in the group
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: group.id,
        ...(partnerIds && {
          partnerId: {
            in: partnerIds,
          },
        }),
        ...(startAfterProgramEnrollmentId && {
          id: {
            gt: startAfterProgramEnrollmentId,
          },
        }),
      },
      take: PAGE_SIZE,
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        partner: {
          select: {
            name: true,
          },
        },
        links: {
          select: {
            id: true,
            domain: true,
            key: true,
            url: true,
          },
        },
      },
    });

    if (programEnrollments.length === 0) {
      console.log(
        `[syncGroupUtmJob] No program enrollments found. Skipping...`,
      );
      return;
    }

    const linksToExpire: Pick<LinkProps, "domain" | "key">[] = [];
    const linkUpdateGroupsByUrl = new Map<
      string,
      {
        linkIds: string[];
        data: {
          url: string;
        } & ReturnType<typeof extractAndResolveUtmParams>;
      }
    >();

    for (const { links, partner } of programEnrollments) {
      for (const link of links) {
        const utmContext = {
          partnerName: partner.name || link.key,
          partnerLinkKey: link.key,
        };

        const resolvedUtmParams = extractAndResolveUtmParams(
          utmTemplate,
          utmContext,
        );

        const resolvedUtmColumns = extractAndResolveUtmParams(
          utmTemplate,
          utmContext,
          { excludeRef: true },
        );

        const data = {
          url: constructURLFromUTMParams(link.url, resolvedUtmParams),
          ...resolvedUtmColumns,
        };

        const existing = linkUpdateGroupsByUrl.get(data.url);

        if (existing) {
          existing.linkIds.push(link.id);
        } else {
          linkUpdateGroupsByUrl.set(data.url, { linkIds: [link.id], data });
        }

        linksToExpire.push({
          domain: link.domain,
          key: link.key,
        });
      }
    }

    const linkUpdateGroups = [...linkUpdateGroupsByUrl.values()];
    const linkUpdateGroupBatches = chunk(linkUpdateGroups, UPDATE_BATCH_SIZE);

    for (const batch of linkUpdateGroupBatches) {
      await Promise.all(
        batch.map(({ linkIds, data }) =>
          prisma.link.updateMany({
            where: {
              id: {
                in: linkIds,
              },
            },
            data,
          }),
        ),
      );
    }

    const totalLinks = linkUpdateGroups.reduce(
      (sum, { linkIds }) => sum + linkIds.length,
      0,
    );

    console.log(
      `[syncGroupUtmJob] Updated ${totalLinks} links. Expiring Redis cache for ${linksToExpire.length} links...`,
    );

    await linkCache.expireMany(linksToExpire);

    // Queue an index update because the UTM template rewrote each link's
    // destination URL.
    await queuePartnerSearchSync({
      enrollmentIds: programEnrollments.map(({ id }) => id),
    });

    if (programEnrollments.length === PAGE_SIZE) {
      startAfterProgramEnrollmentId =
        programEnrollments[programEnrollments.length - 1].id;

      await syncGroupUtmJob.dispatch(
        {
          groupId,
          partnerIds,
          startAfterProgramEnrollmentId,
        },
        {
          delay: 1,
          label: groupId,
        },
      );
      return;
    }

    console.log(
      `[syncGroupUtmJob] Finished syncing UTM settings for ${programEnrollments.length} partners in the ${group.name} group (${group.id}).`,
    );
  },
});
