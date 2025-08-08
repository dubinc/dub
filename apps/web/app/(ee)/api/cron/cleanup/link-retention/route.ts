import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { recordLinkTB, transformLinkTB } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Domain } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// This route is used to delete old links for domains with linkRetentionDays set
// Runs once every 12 hours (0 */12 * * *)
// GET /api/cron/cleanup/link-retention
async function handler(req: Request) {
  try {
    if (req.method === "GET") {
      await verifyVercelSignature(req);

      const domains = await prisma.domain.findMany({
        where: {
          linkRetentionDays: {
            not: null,
          },
        },
      });

      await Promise.all(domains.map((domain) => deleteOldLinks(domain)));
    } else if (req.method === "POST") {
      const rawBody = await req.text();

      await verifyQstashSignature({
        req,
        rawBody,
      });

      const { domain: passedDomain } = z
        .object({
          domain: z.string(),
        })
        .parse(JSON.parse(rawBody));

      const domain = await prisma.domain.findUniqueOrThrow({
        where: {
          slug: passedDomain,
        },
      });

      await deleteOldLinks(domain);
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

const LINKS_PER_BATCH = 100;
const MAX_LINK_BATCHES = 10;

async function deleteOldLinks(
  domain: Pick<Domain, "id" | "slug" | "linkRetentionDays" | "projectId">,
) {
  if (
    !domain.linkRetentionDays ||
    !domain.projectId ||
    domain.linkRetentionDays <= 0
  )
    return;

  let processedBatches = 0;
  let hasMoreLinks = false;

  while (processedBatches < MAX_LINK_BATCHES) {
    const links = await prisma.link.findMany({
      where: {
        domain: domain.slug,
        createdAt: {
          lt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * domain.linkRetentionDays,
          ),
        },
        linkRetentionCleanupDisabledAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: LINKS_PER_BATCH,
    });

    console.log(
      `[Link retention cleanup] Found ${links.length} links to delete for ${domain.slug} that are older than ${domain.linkRetentionDays} days`,
    );

    if (links.length === 0) break;

    // Check if we might have more links (if we got a full batch)
    hasMoreLinks = links.length === LINKS_PER_BATCH;

    console.log(
      `[Link retention cleanup] Deleting ${links.length} links for ${domain.slug} (batch ${processedBatches + 1})...`,
    );

    console.table(links, ["shortLink", "createdAt"]);

    await prisma.$transaction(async (tx) => {
      await tx.link.deleteMany({
        where: {
          id: {
            in: links.map(({ id }) => id),
          },
        },
      });
      await tx.project.update({
        where: {
          id: domain.projectId!,
        },
        data: {
          totalLinks: { decrement: links.length },
        },
      });
    });

    // // Record the links deletion in Tinybird
    // // not 100% sure if we need this yet, maybe we should just delete the link completely from TB to save space?
    await recordLinkTB(
      links.map((link) => ({
        ...transformLinkTB(link),
        deleted: true,
      })),
    );

    console.log(
      `[Link retention cleanup] Deleted ${links.length} links for ${domain.slug} that are older than ${domain.linkRetentionDays} days!`,
    );

    ++processedBatches;

    // sleep for 250ms
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  // Only schedule another run if we hit the batch limit AND we found a full batch
  // (indicating there might be more links to process)
  if (processedBatches >= MAX_LINK_BATCHES && hasMoreLinks) {
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/cleanup/link-retention`,
      method: "POST",
      body: {
        domain: domain.slug,
      },
    });
  }
}

export { handler as GET, handler as POST };
