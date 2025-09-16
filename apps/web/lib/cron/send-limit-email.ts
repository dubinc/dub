import { sendBatchEmail } from "@dub/email";
import ClicksExceeded from "@dub/email/templates/clicks-exceeded";
import LinksLimitAlert from "@dub/email/templates/links-limit";
import { prisma } from "@dub/prisma";
import { WorkspaceProps } from "../types";

export const sendLimitEmail = async ({
  emails,
  workspace,
  type,
}: {
  emails: string[];
  workspace: WorkspaceProps;
  type:
    | "firstUsageLimitEmail"
    | "secondUsageLimitEmail"
    | "firstLinksLimitEmail"
    | "secondLinksLimitEmail";
}) => {
  const percentage = Math.round(
    (workspace.linksUsage / workspace.linksLimit) * 100,
  );

  return await Promise.allSettled([
    sendBatchEmail(
      emails.map((email) => ({
        subject: type.endsWith("UsageLimitEmail")
          ? "Dub Alert: Clicks Limit Exceeded"
          : `Dub Alert: ${workspace.name} has used ${percentage.toString()}% of its links limit for the month.`,
        to: email,
        react: type.endsWith("UsageLimitEmail")
          ? ClicksExceeded({
              email,
              workspace,
              type: type as "firstUsageLimitEmail" | "secondUsageLimitEmail",
            })
          : LinksLimitAlert({
              email,
              workspace,
            }),
        variant: "notifications",
      })),
    ),
    prisma.sentEmail.create({
      data: {
        projectId: workspace.id,
        type,
      },
    }),
  ]);
};
