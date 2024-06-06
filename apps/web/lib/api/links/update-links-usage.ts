import { sendLimitEmail } from "@/lib/cron/send-limit-email";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { log } from "@dub/utils";

export async function updateLinksUsage({
  workspaceId,
  increment,
}: {
  workspaceId: string;
  increment: number;
}) {
  const workspace = await prisma.project.update({
    where: {
      id: workspaceId,
    },
    data: {
      linksUsage: {
        increment,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      linksUsage: true,
      linksLimit: true,
      plan: true,
    },
  });

  const percentage = Math.round(
    (workspace.linksUsage / workspace.linksLimit) * 100,
  );

  // Skip if the workspace is below 80% of the limit
  if (percentage < 80) {
    return;
  }

  const sentEmails = await prisma.sentEmail.findMany({
    where: {
      projectId: workspaceId,
    },
    select: {
      type: true,
    },
  });

  const sentNotification = sentEmails.some(
    (email) =>
      email.type ===
      (percentage >= 80 && percentage < 100
        ? "firstLinksLimitEmail"
        : "secondLinksLimitEmail"),
  );

  // Skip if the email has already been sent
  if (sentNotification) {
    console.log(`${workspace.slug} has already been notified, skipping...`);
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      projects: {
        some: {
          projectId: workspaceId,
        },
      },
    },
    select: {
      email: true,
    },
  });

  const emails = users.map(({ email }) => email) as string[];

  return await Promise.allSettled([
    sendLimitEmail({
      emails,
      workspace: workspace as WorkspaceProps,
      type:
        percentage >= 80 && percentage < 100
          ? "firstLinksLimitEmail"
          : "secondLinksLimitEmail",
    }),

    log({
      message: `*${
        workspace.slug
      }* has used ${percentage.toString()}% of its links limit for the month.`,
      type: workspace.plan === "free" ? "cron" : "alerts",
      mention: workspace.plan !== "free",
    }),
  ]);
}
