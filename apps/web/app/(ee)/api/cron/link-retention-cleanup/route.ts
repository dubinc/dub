import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { recordLinkTB, transformLinkTB } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { Domain } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to delete old links for domains with linkRetentionDays set
// Runs every minute (* * * * *)
// GET /api/cron/link-retention-cleanup
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const domains = await prisma.domain.findMany({
      where: {
        linkRetentionDays: {
          not: null,
        },
      },
      select: {
        id: true,
        slug: true,
        linkRetentionDays: true,
        projectId: true,
      },
    });

    await Promise.all(domains.map((domain) => deleteOldLinks(domain)));

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
  }
}
