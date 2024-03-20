import { Client, Receiver } from "@upstash/qstash";
import Bottleneck from "bottleneck";
import { sendEmail } from "emails";
import ClicksExceeded from "emails/clicks-exceeded";
import LinksLimitAlert from "emails/links-limit";
import prisma from "./prisma";
import { WorkspaceProps } from "./types";

export const limiter = new Bottleneck({
  maxConcurrent: 1, // maximum concurrent requests
  minTime: 100, // minimum time between requests in ms
});

// we're using Upstash's Receiver to verify the request signature
export const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

export const verifySignature = async (req: Request) => {
  const authHeader = req.headers.get("authorization");

  // if we're on Vercel and:
  //  1. there's no CRON_SECRET env var
  //  2. request doesn't have the correct auth header,
  // then return false
  if (
    process.env.VERCEL === "1" &&
    (!process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`)
  ) {
    return false;
  }
  return true;
};

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
