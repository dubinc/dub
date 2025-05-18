import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import z from "@/lib/zod";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { NextResponse } from "next/server";
import { sendDomainTransferredEmail } from "./utils";

const schema = z.object({
  currentWorkspaceId: z.string(),
  newWorkspaceId: z.string(),
  domain: z.string(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { currentWorkspaceId, newWorkspaceId, domain } = schema.parse(
      JSON.parse(rawBody),
    );

    const links = await prisma.link.findMany({
      where: { domain, projectId: currentWorkspaceId },
      take: 100,
    });

    // No remaining links to transfer
    if (!links || links.length === 0) {
      // Send email to the owner of the current workspace
      const linksCount = await prisma.link.count({
        where: { domain, projectId: newWorkspaceId },
      });

      await sendDomainTransferredEmail({
        domain,
        currentWorkspaceId,
        newWorkspaceId,
        linksCount,
      });
    } else {
      // Transfer links to the new workspace
      const linkIds = links.map((link) => link.id);

      await Promise.all([
        prisma.link.updateMany({
          where: {
            domain,
            projectId: currentWorkspaceId,
            id: {
              in: linkIds,
            },
          },
          data: {
            projectId: newWorkspaceId,
            folderId: null,
          },
        }),

        prisma.linkTag.deleteMany({
          where: { linkId: { in: linkIds } },
        }),

        // Update links in redis
        linkCache.mset(
          links.map((link) => ({ ...link, projectId: newWorkspaceId })),
        ),

        // Remove the webhooks associated with the links
        prisma.linkWebhook.deleteMany({
          where: { linkId: { in: linkIds } },
        }),

        recordLink(
          links.map((link) => ({
            ...link,
            projectId: newWorkspaceId,
            folderId: null,
          })),
        ),
      ]);

      // wait 500 ms before making another request
      await new Promise((resolve) => setTimeout(resolve, 500));

      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/transfer`,
        body: {
          currentWorkspaceId,
          newWorkspaceId,
          domain,
        },
      });
    }

    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: `Error transferring domain: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
