import { deleteDomainAndLinks } from "@/lib/api/domains";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@/lib/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const E2E_USER_ID = "clxz1q7c7000hbqx5ckv4r82h";
const E2E_WORKSPACE_ID = "clrei1gld0002vs9mzn93p8ik";

// Cron to remove links and domains created during the E2E test.
// Run every 6 hours (0 */6 * * *)
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60);

    const [links, domains] = await Promise.all([
      prisma.link.findMany({
        where: {
          userId: E2E_USER_ID,
          projectId: E2E_WORKSPACE_ID,
          createdAt: {
            lt: oneHourAgo,
          },
        },
        include: {
          tags: true,
        },
        take: 100,
      }),

      prisma.domain.findMany({
        where: {
          projectId: E2E_WORKSPACE_ID,
          slug: {
            endsWith: ".dub-internal-test.com",
          },
          createdAt: {
            lt: oneHourAgo,
          },
        },
        select: {
          slug: true,
        },
      }),
    ]);

    // Delete the links
    if (links.length > 0) {
      await prisma.link.deleteMany({
        where: {
          id: {
            in: links.map((link) => link.id),
          },
        },
      });

      // Post delete cleanup
      await bulkDeleteLinks({
        links,
      });
    }

    // Delete the domains
    if (domains.length > 0) {
      await Promise.all(
        domains.map((domain) => deleteDomainAndLinks(domain.slug)),
      );
    }

    console.log(`Removed ${links.length} links and ${domains.length} domains`);

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    await log({
      message: `Links and domain cleanup failed - ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
