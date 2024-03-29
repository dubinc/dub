import { verifySignature } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { log } from "@dub/utils";
import { sendLinksUsageEmail } from "./utils";

// Cron to update the links usage of each workspace.
// Runs once every 10 mins (*/10 * * * *)

export async function GET(req: Request) {
  const validSignature = await verifySignature(req);

  if (!validSignature) {
    return new Response("Unauthorized", { status: 401 });
  }

  // get links created in the last 5 minutes
  const links = await prisma.link.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000),
      },
    },
    select: {
      projectId: true,
    },
  });

  const workspacesToCheck = links
    .map((link) => link.projectId)
    .filter(Boolean) as string[];

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

  try {
    await Promise.allSettled(
      workspaces.map((workspace) => sendLinksUsageEmail(workspace)),
    );

    return new Response("OK");
  } catch (error) {
    await log({
      message: "Links usage cron failed. Error: " + error.message,
      type: "errors",
    });

    return new Response(error.message, { status: 500 });
  }
}
