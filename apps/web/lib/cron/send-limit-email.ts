import { prisma } from "@dub/prisma";
import { sendEmail } from "emails";
import ClicksExceeded from "emails/clicks-exceeded";
import LinksLimitAlert from "emails/links-limit";
import { WorkspaceProps } from "../types";
import { limiter } from "./limiter";

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
    emails.map((email) => {
      limiter.schedule(() =>
        sendEmail({
          subject: type.endsWith("UsageLimitEmail")
            ? `${process.env.NEXT_PUBLIC_APP_NAME} Alert: Clicks Limit Exceeded`
            : `${process.env.NEXT_PUBLIC_APP_NAME} Alert: ${
                workspace.name
              } has used ${percentage.toString()}% of its links limit for the month.`,
          email,
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
        }),
      );
    }),
    prisma.sentEmail.create({
      data: {
        projectId: workspace.id,
        type,
      },
    }),
  ]);
};
