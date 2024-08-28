import { deleteDomainAndLinks } from "@/lib/api/domains";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { deleteLink } from "@/lib/api/links";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@/lib/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const E2E_USER_ID = "REPLACE_WITH_E2E_USER_ID";
const E2E_WORKSPACE_ID = "REPLACE_WITH_E2E_WORKSPACE_ID";

// Cron to remove links and domains created during the E2E test.
// Runs once every day at noon UTC (0 12 * * *)
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
        select: {
          id: true,
        },
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

    if (links.length > 0) {
      await Promise.all(links.map((link) => deleteLink(link.id)));
    }

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
