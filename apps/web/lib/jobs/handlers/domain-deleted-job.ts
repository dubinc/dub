import { R2_URL } from "@dub/utils";
import * as z from "zod/v4";
import { linkCache } from "../../api/links/cache";
import { includeProgramEnrollment } from "../../api/links/include-program-enrollment";
import { includeTags } from "../../api/links/include-tags";
import { CRON_BATCH_SIZE } from "../../cron";
import { limiter } from "../../cron/limiter";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import { recordLink } from "../../tinybird";
import { defineJob } from "../index";

const inputSchema = z.object({
  domain: z.string(),
});

// Job to delete a domain and all its links
export const domainDeletedJob = defineJob({
  name: "domain-deleted-job",
  schema: inputSchema,
  async handle(input) {
    const { domain } = input;

    const domainRecord = await prisma.domain.findUnique({
      where: {
        slug: domain,
      },
      select: {
        projectId: true,
        logo: true,
      },
    });

    if (!domainRecord) {
      console.error(
        `[domainDeletedJob] Domain ${domain} not found. Skipping...`,
      );
      return;
    }

    if (domainRecord.projectId !== null) {
      console.error(
        `[domainDeletedJob] Domain ${domain} not marked for deletion. Skipping...`,
      );
      return;
    }

    const links = await prisma.link.findMany({
      where: {
        domain,
      },
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
      },
      take: CRON_BATCH_SIZE,
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`[domainDeletedJob] Found ${links.length} links to delete.`);

    if (links.length > 0) {
      const workspaceId = links[0].projectId;

      const { count } = await prisma.$transaction(async (tx) => {
        const result = await tx.link.deleteMany({
          where: {
            id: {
              in: links.map((link) => link.id),
            },
          },
        });

        if (result.count === 0) {
          return result;
        }

        // Update the workspace's total links count
        if (workspaceId) {
          await tx.project.update({
            where: {
              id: workspaceId,
            },
            data: {
              totalLinks: {
                decrement: result.count,
              },
            },
          });
        }

        return result;
      });

      if (count > 0) {
        await Promise.allSettled([
          // Remove the link from Redis
          linkCache.deleteMany(links),

          // Record link in Tinybird
          recordLink(links, { deleted: true }),

          // Remove image from R2 storage if it exists
          ...links
            .filter((link) =>
              link.image?.startsWith(`${R2_URL}/images/${link.id}`),
            )
            .map((link) =>
              limiter.schedule(() =>
                storage.delete({
                  key: link.image!.replace(`${R2_URL}/`, ""),
                }),
              ),
            ),
        ]);
      }

      // More links remain — queue the next batch.
      if (links.length === CRON_BATCH_SIZE) {
        await domainDeletedJob.dispatch(
          {
            domain,
          },
          {
            delay: 1,
            label: domain,
          },
        );
        return;
      }
    }

    // No more links left. Delete the domain and logo.
    await prisma.domain.delete({
      where: {
        slug: domain,
      },
    });

    if (domainRecord.logo) {
      await storage.delete({
        key: domainRecord.logo.replace(`${R2_URL}/`, ""),
      });
    }

    console.log(`[domainDeletedJob] Domain ${domain} deleted from database.`);
  },
});
