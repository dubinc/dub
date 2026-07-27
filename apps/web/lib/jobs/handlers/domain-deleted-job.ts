import { removeDomainFromVercel } from "@/lib/api/domains/remove-domain-vercel";
import { deleteLinks } from "@/lib/api/links/delete-links";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { R2_URL } from "@dub/utils";
import * as z from "zod/v4";
import { CRON_BATCH_SIZE } from "../../cron";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
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
      await deleteLinks(links);

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

    // No more links left – delete the domain
    await prisma.domain.delete({
      where: {
        slug: domain,
      },
    });

    // side effects: remove from Vercel, and delete the logo (if it exists)
    const response = await Promise.allSettled([
      removeDomainFromVercel(domain),
      domainRecord.logo &&
        storage.delete({
          key: domainRecord.logo.replace(`${R2_URL}/`, ""),
        }),
    ]);

    response.forEach((promise) => {
      if (promise.status === "rejected") {
        console.error("domainDeletedJob", {
          reason: promise.reason,
          domain,
        });
      }
    });

    console.log(`[domainDeletedJob] Domain "${domain}" fully deleted.`);
  },
});
