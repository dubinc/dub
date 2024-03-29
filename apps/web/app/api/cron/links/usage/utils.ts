import { sendLimitEmail } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { Project, SentEmail } from "@prisma/client";
import { log } from "@dub/utils";

// Check if the workspace is close to the links limit and send an email to the users
export const sendLinksUsageEmail = async (
  workspace: Pick<
    Project,
    "id" | "name" | "slug" | "plan" | "linksUsage" | "linksLimit"
  > & {
    sentEmails?: SentEmail[];
  },
) => {
  const percentage = Math.round(
    (workspace.linksUsage / workspace.linksLimit) * 100,
  );

  // Skip if the workspace is below 80% of the limit
  if (percentage < 80) {
    return;
  }

  const sentEmails = workspace.sentEmails || [];

  const sentNotification = sentEmails.some(
    (email) =>
      email.type ===
      (percentage >= 80 && percentage < 100
        ? "firstLinksLimitEmail"
        : "secondLinksLimitEmail"),
  );

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
};
