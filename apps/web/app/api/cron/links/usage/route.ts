import { sendLimitEmail, verifySignature } from "@/lib/cron";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Cron to update the links usage of each workspace.
// Runs once every 5 mins (*/5 * * * *)

export async function GET(req: Request) {
  const validSignature = await verifySignature(req);
  if (!validSignature) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const workspaces = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        linksUsage: true,
        linksLimit: true,
      },
    });

    for (const workspace of workspaces) {
      const percentage = Math.round(
        (workspace.linksUsage / workspace.linksLimit) * 100,
      );

      // Skip if the workspace is not close to the limit
      if (![80, 100].includes(percentage)) {
        continue;
      }

      const sentNotification = await prisma.sentEmail.count({
        where: {
          projectId: workspace.id,
          type:
            percentage === 80
              ? "firstLinksLimitEmail"
              : "secondLinksLimitEmail",
        },
      });

      // Skip if the email has already been sent
      if (sentNotification) {
        continue;
      }

      const users = await prisma.user.findMany({
        where: {
          projects: {
            some: {
              projectId: workspace.id,
            },
          },
        },
        select: {
          email: true,
        },
      });

      const emails = users.map(({ email }) => email) as string[];

      await sendLimitEmail({
        emails,
        workspace,
        type:
          percentage === 80 ? "firstLinksLimitEmail" : "secondLinksLimitEmail",
      });

      log({
        message: `*${
          workspace.slug
        }* has used ${percentage.toString()}% of its links limit for the month.`,
        type: workspace.plan === "free" ? "cron" : "alerts",
        mention: workspace.plan !== "free",
      });
    }

    return new Response("OK");
  } catch (error) {
    await log({
      message: "Usage cron failed. Error: " + error.message,
      type: "errors",
    });

    return new Response(error.message, { status: 500 });
  }
}
