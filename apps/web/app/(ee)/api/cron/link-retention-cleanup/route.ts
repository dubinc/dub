import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { recordLinkTB, transformLinkTB } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { pluralize } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DOMAINS_PER_BATCH = 10;
const MAX_DOMAIN_BATCHES = 1_000;

// This route is used to delete old links for domains with linkRetentionDays set
// GET /api/cron/link-retention-cleanup
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    let processedBatches = 0;
    let cursor: string | null = null;

    while (processedBatches < MAX_DOMAIN_BATCHES) {
      const domains = await prisma.domain.findMany({
        select: {
          id: true,
          slug: true,
          linkRetentionDays: true,
        },
        where: {
          linkRetentionDays: {
            not: null,
          },
        },
        orderBy: {
          id: "asc",
        },
        take: DOMAINS_PER_BATCH,
        skip: cursor ? 1 : 0,
        ...(cursor && {
          cursor: {
            id: cursor,
          },
        }),
      });

      if (domains.length === 0) break;

      for (const domain of domains) {
        if (domain.linkRetentionDays)
          await deleteOldLinks(domain.slug, domain.linkRetentionDays);
      }

      ++processedBatches;
      cursor = domains[domains.length - 1].id;

      console.log(
        `[Delete old links] Deleted old links for ${domains.length} ${pluralize("domain", domains.length)}`,
      );

      // Pause for 2 seconds before the next batch of domains
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

const LINKS_PER_BATCH = 200;
const MAX_LINK_BATCHES = 100;

async function deleteOldLinks(domain: string, linkRetentionDays: number) {
  let processedBatches = 0;

  while (processedBatches < MAX_LINK_BATCHES) {
    const links = await prisma.link.findMany({
      where: {
        domain,
        key: {
          not: "_root",
        },
        archived: false,
        createdAt: {
          lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * linkRetentionDays),
        },
        linkRetentionCleanupDisabledAt: null,
      },
      orderBy: {
        id: "asc",
      },
      take: LINKS_PER_BATCH,
    });

    if (links.length === 0) break;

    console.log(
      `[Delete old links] Deleting ${links.length} links for ${domain} (batch ${processedBatches + 1})...`,
    );
    const [recordedLinks, deletedLinks] = await Promise.allSettled([
      // Record the links deletion in Tinybird
      // not 100% sure if we need this yet, maybe we should just delete the link completely from TB to save space?
      recordLinkTB(
        links.map((link) => ({
          ...transformLinkTB(link),
          deleted: true,
        })),
      ),
      prisma.link.deleteMany({
        where: {
          id: {
            in: links.map(({ id }) => id),
          },
        },
      }),
    ]);

    if (recordedLinks.status !== "fulfilled") {
      console.error(
        `[Delete old links] Failed to record links deletion for ${domain}: ${recordedLinks.reason}`,
      );
    }

    if (deletedLinks.status !== "fulfilled") {
      console.error(
        `[Delete old links] Failed to delete links for ${domain}: ${deletedLinks.reason}`,
      );
    }

    if (
      deletedLinks.status === "fulfilled" &&
      recordedLinks.status === "fulfilled"
    ) {
      console.log(
        `[Delete old links] Deleted ${deletedLinks.value.count} links for ${domain}!`,
      );
    }

    ++processedBatches;

    // Pause for 2 seconds before the next batch of links
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
