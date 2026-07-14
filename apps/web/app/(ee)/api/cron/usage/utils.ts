import { getAnalytics } from "@/lib/analytics/get-analytics";
import { qstash } from "@/lib/cron";
import {
  getSlackWebhooks,
  sendWorkspaceLimitAlert,
} from "@/lib/cron/send-limit-alert";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { sendBatchEmail } from "@dub/email";
import ClicksSummary from "@dub/email/templates/clicks-summary";
import {
  APP_DOMAIN_WITH_NGROK,
  capitalize,
  getAdjustedBillingCycleStart,
  log,
} from "@dub/utils";
import { getMonth, getYear } from "date-fns";

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
    return "No workspaces left to update";
  }

  // Reset billing cycles for workspaces that have
  // adjustedBillingCycleStart that matches today's date
  const billingReset = workspaces.filter(
    ({ billingCycleStart }) =>
      getAdjustedBillingCycleStart(billingCycleStart) === new Date().getDate(),
  );

  // Reset usage and alert emails for the billingReset workspaces
  // also send 30-day summary email
  await Promise.allSettled(
    billingReset.map(async (workspace) => {
      const { usage, usageLimit, plan, planPeriod, billingCycleEndsAt } =
        workspace;

      // if yearly plan, we skip resetting usage if the billing cycle end date is not this year+month
      let resetUsage = true;
      if (
        planPeriod === "yearly" &&
        billingCycleEndsAt &&
        !(
          getYear(billingCycleEndsAt) === getYear(new Date()) &&
          getMonth(billingCycleEndsAt) === getMonth(new Date())
        )
      ) {
        resetUsage = false;
      }

      if (resetUsage) {
        /* 
          We only reset events usage if it's not over usageLimit by:
          - 4x for free plan (4K events)
          - 2x for all other plans
        */
        const resetEventsUsage =
          plan === "free" ? usage <= usageLimit * 4 : usage <= usageLimit * 2;

        await prisma.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            usage: resetEventsUsage ? 0 : undefined,
            linksUsage: 0,
            payoutsUsage: 0,
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
        console.log(`Reset usage for workspace "${workspace.slug}"`);
      }

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
        });

        const topLinkIds = topLinks.slice(0, 100).map(({ link }) => link);

        const linksMetadata = await prisma.link.findMany({
          where: {
            projectId: workspace.id,
            id: {
              in: topLinkIds,
            },
          },
          select: {
            id: true,
            shortLink: true,
          },
        });

        const topFiveLinks = topLinks
          .filter((d: { link: string; clicks: number }) =>
            linksMetadata.find((l) => l.id === d.link),
          )
          .slice(0, 5)
          .map((d: { link: string; clicks: number }) => ({
            link: linksMetadata.find((l) => l.id === d.link)!, // coerce here since we're already filtering out links that don't exist
            clicks: d.clicks,
          }));

        const totalClicks = topLinks.reduce(
          (acc, curr) => acc + curr.clicks,
          0,
        );

        const emails = workspace.users.map(
          (user) => user.user.email,
        ) as string[];

        await sendBatchEmail(
          emails.map((email) => ({
            subject: `Your 30-day Dub summary for ${workspace.name}`,
            to: email,
            react: ClicksSummary({
              email,
              workspaceName: workspace.name,
              workspaceSlug: workspace.slug,
              totalClicks,
              createdLinks: workspace.linksUsage,
              topLinks: topFiveLinks,
            }),
            variant: "notifications",
          })),
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

  const slackWebhookByWorkspace = await getSlackWebhooks(
    exceedingUsage.map(({ id }) => id),
  );

  // Send email to notify overages
  await Promise.allSettled(
    exceedingUsage.map(async (workspace) => {
      const { slug, plan, usage, usageLimit, users, sentEmails } = workspace;
      const emails = users.map((user) => user.user.email) as string[];
      const slackWebhookUrl = slackWebhookByWorkspace.get(workspace.id);

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
        await sendWorkspaceLimitAlert({
          emails,
          workspace: workspace as unknown as WorkspaceProps,
          type: "firstUsageLimitEmail",
          slackWebhookUrl,
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
            sendWorkspaceLimitAlert({
              emails,
              workspace: workspace as unknown as WorkspaceProps,
              type: "secondUsageLimitEmail",
              slackWebhookUrl,
            });
          }
        }
      }
    }),
  );

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/usage`,
    method: "POST",
    body: {},
  });

  return `Updated usage stats for ${workspaces.length} workspaces`;
};
