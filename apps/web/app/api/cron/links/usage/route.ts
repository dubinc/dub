import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@/lib/prisma";
import { log } from "@dub/utils";
import { sendLinksUsageEmail } from "./utils";

// Cron to update the links usage of each workspace.
// Runs once every 15 mins (*/15 * * * *)

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    // get links created in the last 15 minutes
    const links = await prisma.link.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000),
        },
      },
      select: {
        projectId: true,
      },
    });

    const workspacesToCheck = links
      .map((link) => link.projectId)
      .filter(Boolean) as string[];

    console.log(
      "Links created in the last 15 minutes: ",
      links.length,
      "Workspaces to check: ",
      workspacesToCheck,
    );

    const workspaces = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        linksUsage: true,
        linksLimit: true,
        sentEmails: true,
      },
      where: {
        id: {
          in: workspacesToCheck,
        },
      },
    });

    if (workspaces.length === 0) {
      return new Response("OK");
    }

    await Promise.allSettled(
      workspaces.map((workspace) => sendLinksUsageEmail(workspace)),
    );

    return new Response("OK");
  } catch (error) {
    await log({
      message: "Links usage cron failed. Error: " + error.message,
      type: "errors",
    });
    return handleAndReturnErrorResponse(error);
  }
}
