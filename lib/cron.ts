import prisma from "@/lib/prisma";
import { redis, deleteProject } from "@/lib/upstash";
import { removeDomain } from "./domains";

export const handleDomainUpdates = async (
  domain: string,
  createdAt: Date,
  verified: boolean,
  changed: boolean
) => {
  if (changed) {
    await log(`Domain *${domain}* changed status to *${verified}*`);
  }

  if (verified) return;

  const invalidDays = Math.floor(
    (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 3600 * 24)
  );

  if (invalidDays > 7) {
    await log(`Domain *${domain}* is invalid for ${invalidDays} days`);
  }

  if (invalidDays > 30) {
    const hasLinks = await redis.exists(`${domain}:links`);
    if (hasLinks === 0) {
      // only delete if there are no resources recorded (links, stats, etc.)
      return await Promise.all([
        prisma.project.delete({
          where: {
            domain,
          },
        }),
        removeDomain(domain),
        deleteProject(domain),
        log(`Domain *${domain}* has been invalid for > 30 days, deleting.`),
      ]);
    } else {
      return await log(
        `Domain *${domain}* has been invalid for > 30 days but has links, not deleting.`
      );
    }
  }
  return;
};

export const log = async (message: string) => {
  /* Log a message to the console */
  if (!process.env.DUB_SLACK_HOOK) return;
  try {
    return await fetch(process.env.DUB_SLACK_HOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message,
            },
          },
        ],
      }),
    });
  } catch (e) {
    console.log(`Failed to log to Vercel Slack. Error: ${e}`);
  }
};
