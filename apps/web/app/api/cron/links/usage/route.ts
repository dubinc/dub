import { sendLimitEmail, verifySignature, qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { Project } from "@prisma/client";
import { APP_DOMAIN_WITH_NGROK, getSearchParams, log } from "@dub/utils";

// Cron to update the links usage of each workspace.
// Runs once every 5 mins (*/5 * * * *)

const limit = 30;

export async function GET(req: Request) {
  const validSignature = await verifySignature(req);

  if (!validSignature) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { skip } = getSearchParams(req.url);

  const workspaces = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      linksUsage: true,
      linksLimit: true,
    },
    take: limit,
    skip: skip ? parseInt(skip) : 0,
  });

  if (workspaces.length === 0) {
    return new Response("OK");
  }

  try {
    await Promise.allSettled(
      workspaces.map((workspace) => sendUsageEmail(workspace)),
    );

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/usage?skip=${
        skip ? parseInt(skip) + limit : limit
      }`,
      method: "GET",
    });

    return new Response("OK");
  } catch (error) {
    await log({
      message: "Usage cron failed. Error: " + error.message,
      type: "errors",
    });

    return new Response(error.message, { status: 500 });
  }
}

// Check if the workspace is close to the limit and send an email to the users
const sendUsageEmail = async (
  workspace: Pick<
    Project,
    "id" | "name" | "slug" | "plan" | "linksUsage" | "linksLimit"
  >,
) => {
  const percentage = Math.round(
    (workspace.linksUsage / workspace.linksLimit) * 100,
  );

  // Skip if the workspace is not close to the limit
  if (![80, 100].includes(percentage)) {
    return;
  }

  const sentNotification = await prisma.sentEmail.count({
    where: {
      projectId: workspace.id,
      type:
        percentage === 80 ? "firstLinksLimitEmail" : "secondLinksLimitEmail",
    },
  });

  // Skip if the email has already been sent
  if (sentNotification) {
    return;
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

  await Promise.allSettled([
    sendLimitEmail({
      emails,
      workspace: workspace as WorkspaceProps,
      type:
        percentage === 80 ? "firstLinksLimitEmail" : "secondLinksLimitEmail",
    }),

    log({
      message: `*${
        workspace.slug
      }* has used ${percentage.toString()}% of its links limit for the month.`,
      type: workspace.plan === "free" ? "cron" : "alerts",
      mention: workspace.plan !== "free",
    }),
  ]);
};
