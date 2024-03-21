import { getAnalytics } from "@/lib/analytics";
import { limiter, qstash, sendLimitEmail } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import {
  APP_DOMAIN_WITH_NGROK,
  capitalize,
  getAdjustedBillingCycleStart,
  linkConstructor,
  log,
} from "@dub/utils";
import { sendEmail } from "emails";
import ClicksSummary from "emails/clicks-summary";

const limit = 250;

export const updateUsage = async (skip?: number) => {
  const workspaces = await prisma.project.findMany({
    where: {
      domains: {
        some: {
          verified: true,
        },
      },
    },
    include: {
      users: {
        select: {
          user: true,
        },
      },
      domains: {
        where: {
          verified: true,
        },
      },
      sentEmails: true,
    },
    skip: skip || 0,
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

  // Reset usage for workspaces that have billingCycleStart today
  // also delete sentEmails for those workspaces
  await Promise.allSettled(
    billingReset.map(async (workspace) => {
      // Only send the 30-day summary email if the workspace was created more than 30 days ago
      if (
        workspace.createdAt.getTime() <
        new Date().getTime() - 30 * 24 * 60 * 60 * 1000
      ) {
        const topLinks =
          workspace.usage > 0
            ? await getAnalytics({
                workspaceId: workspace.id,
                endpoint: "top_links",
                interval: "30d",
                excludeRoot: true,
              }).then(async (data) => {
                const topFive = data.slice(0, 5);
                return await Promise.all(
                  topFive.map(
                    async ({
                      link: linkId,
                      clicks,
                    }: {
                      link: string;
                      clicks: number;
                    }) => {
                      const link = await prisma.link.findUnique({
                        where: {
                          id: linkId,
                        },
                        select: {
                          domain: true,
                          key: true,
                        },
                      });
                      if (!link) return;
                      return {
                        link: linkConstructor({
                          domain: link.domain,
                          key: link.key,
                          pretty: true,
                        }),
                        clicks,
                      };
                    },
                  ),
                );
              })
            : [];

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

      const { plan, usage, usageLimit } = workspace;

      // only reset clicks usage if it's not over usageLimit by:
      // 2x for free plan (2K clicks)
      // 1.5x for pro plan (75K clicks)
      // 1.2x for business plan (300K clicks)

      const resetUsage =
        plan === "free"
          ? usage < usageLimit * 2
          : plan === "pro"
            ? usage < usageLimit * 1.5
            : plan.startsWith("business")
              ? usage < usageLimit * 1.2
              : true;

      return await prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          ...(resetUsage && {
            usage: 0,
          }),
          // always reset linksUsage since folks can never create more links than their limit
          linksUsage: 0,
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
    }),
  );

  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/usage?skip=${
      skip ? skip + limit : limit
    }`,
    method: "GET",
  });
};
