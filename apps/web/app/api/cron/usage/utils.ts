import { getAnalytics } from "@/lib/analytics/get-analytics";
import { qstash } from "@/lib/cron";
import { limiter } from "@/lib/cron/limiter";
import { sendLimitEmail } from "@/lib/cron/send-limit-email";
import { WorkspaceProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  capitalize,
  getAdjustedBillingCycleStart,
  linkConstructor,
  log,
} from "@dub/utils";
import { sendEmail } from "emails";
import ClicksSummary from "emails/clicks-summary";

const limit = 100;

export const updateUsage = async () => {
  const workspaces = await prisma.project.findMany({
    where: {
      // Check only workspaces that haven't been checked in the last 12 hours
      usageLastChecked: {
        lt: new Date(new Date().getTime() - 12 * 60 * 60 * 1000),
      },
    },
    include: {
      users: {
        select: {
          user: true,
        },
        where: {
          user: {
            isMachine: false,
          },
          notificationPreference: {
            linkUsageSummary: true,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 10, // Only send to the first 10 users
      },
      sentEmails: true,
    },
    orderBy: [
      {
        usageLastChecked: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    take: limit,
  });

  // if no workspaces left, meaning cron is complete
  if (workspaces.length === 0) {
    return;
  }

  // Reset billing cycles for workspaces that have
  // adjustedBillingCycleStart that matches today's date
  const billingReset = workspaces.filter(
    ({ billingCycleStart }) =>
      getAdjustedBillingCycleStart(billingCycleStart as number) ===
      new Date().getDate(),
  );

  // Reset usage and alert emails for the billingReset workspaces
  // also send 30-day summary email
  await Promise.allSettled(
    billingReset.map(async (workspace) => {
      const { plan, usage, usageLimit } = workspace;

      /* 
        We only reset clicks usage if it's not over usageLimit by:
        - 4x for free plan (4K clicks)
        - 2x for all other plans
      */

      const resetUsage =
        plan === "free" ? usage <= usageLimit * 4 : usage <= usageLimit * 2;

      await prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          ...(resetUsage && {
            usage: 0,
          }),
          linksUsage: 0,
          salesUsage: 0,
          aiUsage: 0,
          sentEmails: {
            deleteMany: {
              type: {
                in: [
                  "firstUsageLimitEmail",
                  "secondUsageLimitEmail",
                  "firstLinksLimitEmail",
                  "secondLinksLimitEmail",
                ],
              },
            },
          },
        },
      });

      /* Only send the 30-day summary email if:
         - the workspace has at least 1 link click
         - the workspace was created more than 30 days ago
       */
      if (
        workspace.usage > 0 &&
        workspace.createdAt.getTime() <
          new Date().getTime() - 30 * 24 * 60 * 60 * 1000
      ) {
        const topLinks = await getAnalytics({
          workspaceId: workspace.id,
          event: "clicks",
          groupBy: "top_links",
          interval: "30d",
          root: false,
        }).then(async (data) => {
          const topFive = data.slice(0, 5);
          const topFiveLinkIds = topFive.map(({ link }) => link);

          const links = await prisma.link.findMany({
            where: {
              projectId: workspace.id,
              id: {
                in: topFiveLinkIds,
              },
            },
            select: {
              id: true,
              domain: true,
              key: true,
            },
          });

          const allLinks = links.map((link) => ({
            id: link.id,
            shortLink: linkConstructor({
              domain: link.domain,
              key: link.key,
              pretty: true,
            }),
          }));

          return topFive.map((d) => ({
            link: allLinks.find((l) => l.id === d.link)?.shortLink || "",
            clicks: d.clicks,
          }));
        });

        const emails = workspace.users.map(
          (user) => user.user.email,
        ) as string[];

        await Promise.allSettled(
          emails.map((email) => {
            limiter.schedule(() =>
              sendEmail({
                subject: `Your 30-day ${process.env.NEXT_PUBLIC_APP_NAME} summary for ${workspace.name}`,
                email,
                react: ClicksSummary({
                  email,
                  appName: process.env.NEXT_PUBLIC_APP_NAME as string,
                  appDomain: process.env.NEXT_PUBLIC_APP_DOMAIN as string,
                  workspaceName: workspace.name,
                  workspaceSlug: workspace.slug,
                  totalClicks: workspace.usage,
                  createdLinks: workspace.linksUsage,
                  topLinks,
                }),
              }),
            );
          }),
        );
      }
    }),
  );

  // Update usageLastChecked for workspaces
  await prisma.project.updateMany({
    where: {
      id: {
        in: workspaces.map(({ id }) => id),
      },
    },
    data: {
      usageLastChecked: new Date(),
    },
  });

  // Get all workspaces that have exceeded usage
  const exceedingUsage = workspaces.filter(
    ({ usage, usageLimit }) => usage > usageLimit,
  );

  // Send email to notify overages
  await Promise.allSettled(
    exceedingUsage.map(async (workspace) => {
      const { slug, plan, usage, usageLimit, users, sentEmails } = workspace;
      const emails = users.map((user) => user.user.email) as string[];

      await log({
        message: `*${slug}* is over their *${capitalize(
          plan,
        )} Plan* usage limit. Usage: ${usage}, Limit: ${usageLimit}, Email: ${emails.join(
          ", ",
        )}`,
        type: plan === "free" ? "cron" : "alerts",
        mention: plan !== "free",
      });
      const sentFirstUsageLimitEmail = sentEmails.some(
        (email) => email.type === "firstUsageLimitEmail",
      );
      if (!sentFirstUsageLimitEmail) {
        sendLimitEmail({
          emails,
          workspace: workspace as unknown as WorkspaceProps,
          type: "firstUsageLimitEmail",
        });
      } else {
        const sentSecondUsageLimitEmail = sentEmails.some(
          (email) => email.type === "secondUsageLimitEmail",
        );
        if (!sentSecondUsageLimitEmail) {
          const daysSinceFirstEmail = Math.floor(
            (new Date().getTime() -
              new Date(sentEmails[0].createdAt).getTime()) /
              (1000 * 3600 * 24),
          );
          if (daysSinceFirstEmail >= 3) {
            sendLimitEmail({
              emails,
              workspace: workspace as unknown as WorkspaceProps,
              type: "secondUsageLimitEmail",
            });
          }
        }
      }
    }),
  );

  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/usage`,
    method: "POST",
    body: {},
  });
};
