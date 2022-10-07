import prisma from "@/lib/prisma";
import { redis, deleteProject, getUsage } from "@/lib/upstash";
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

  if (invalidDays > 25) {
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

export const updateUsage = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      usageLimit: true,
      stripeId: true,
      billingCycleStart: true,
      projects: {
        select: {
          project: {
            select: {
              id: true,
              domain: true,
              domainVerified: true,
            },
          },
        },
        where: {
          role: "owner",
        },
      },
    },
  });

  const response = await Promise.all(
    users.map(
      async ({ id, email, usageLimit, billingCycleStart, projects }) => {
        // if user has no projects, don't update usage
        if (projects.length === 0) return;

        const usageArr = await Promise.all(
          projects.map(async ({ project: { id, domain, domainVerified } }) => {
            return {
              id,
              usage: domainVerified
                ? await getUsage(domain, billingCycleStart)
                : 0,
            };
          })
        );
        let totalUsage = usageArr.reduce((acc, { usage }) => acc + usage, 0);
        let ownerExceededUsage = totalUsage > usageLimit;

        if (ownerExceededUsage) {
          await log(
            `${email} is over usage limit. Usage: ${totalUsage}, Limit: ${usageLimit}`
          );
        }

        const [updateUser, updateProjects] = await Promise.all([
          prisma.user.update({
            where: {
              id,
            },
            data: {
              usage: totalUsage,
            },
          }),
          Promise.all(
            usageArr.map(async ({ id, usage }) => {
              return await prisma.project.update({
                where: {
                  id,
                },
                data: {
                  usage,
                  ownerExceededUsage,
                },
              });
            })
          ),
        ]);

        return {
          updateUser,
          updateProjects,
        };
      }
    )
  );

  return response;
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
