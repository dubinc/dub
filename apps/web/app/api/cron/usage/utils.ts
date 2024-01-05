import { limiter, qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { getStats } from "@/lib/stats";
import { ProjectProps } from "@/lib/types";
import {
  APP_DOMAIN_WITH_NGROK,
  getAdjustedBillingCycleStart,
  linkConstructor,
  log,
} from "@dub/utils";
import { sendEmail } from "emails";
import ClicksSummary from "emails/clicks-summary";
import UsageExceeded from "emails/usage-exceeded";

const limit = 250;

export const updateUsage = async (skip?: number) => {
  const projects = await prisma.project.findMany({
    where: {
      domains: {
        some: {
          verified: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      usage: true,
      usageLimit: true,
      plan: true,
      billingCycleStart: true,
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
      createdAt: true,
    },
    skip: skip || 0,
    take: limit,
  });

  // if no projects left, meaning cron is complete
  if (projects.length === 0) {
    return;
  }

  // Reset billing cycles for projects that:
  // - Are not on the free plan
  // - Are on the free plan but have not exceeded usage
  // - Have adjustedBillingCycleStart that matches today's date
  const billingReset = projects.filter(
    ({ usage, usageLimit, plan, billingCycleStart }) =>
      !(plan === "free" && usage > usageLimit) &&
      getAdjustedBillingCycleStart(billingCycleStart as number) ===
        new Date().getDate(),
  );

  // Get all projects that have exceeded usage
  const exceedingUsage = projects.filter(
    ({ usage, usageLimit }) => usage > usageLimit,
  );

  // Send email to notify overages
  await Promise.allSettled(
    exceedingUsage.map(async (project) => {
      const { name, usage, usageLimit, users, sentEmails } = project;
      const emails = users.map((user) => user.user.email) as string[];

      await log({
        message: `${name} is over usage limit. Usage: ${usage}, Limit: ${usageLimit}, Email: ${emails.join(
          ", ",
        )}`,
        type: "cron",
        mention: true,
      });
      const sentFirstUsageLimitEmail = sentEmails.some(
        (email) => email.type === "firstUsageLimitEmail",
      );
      if (!sentFirstUsageLimitEmail) {
        // @ts-ignore
        sendUsageLimitEmail(emails, project, "first");
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
            // @ts-ignore
            sendUsageLimitEmail(emails, project, "second");
          }
        }
      }
    }),
  );

  // Reset usage for projects that have billingCycleStart today
  // also delete sentEmails for those projects
  await Promise.allSettled(
    billingReset.map(async (project) => {
      // Only send the 30-day summary email if the project was created more than 30 days ago
      if (
        project.createdAt.getTime() <
        new Date().getTime() - 30 * 24 * 60 * 60 * 1000
      ) {
        const [createdLinks, topLinks] = await Promise.allSettled([
          prisma.link.count({
            where: {
              project: {
                id: project.id,
              },
              createdAt: {
                // in the last 30 days
                gte: new Date(new Date().setDate(new Date().getDate() - 30)),
              },
            },
          }),
          project.usage > 0
            ? getStats({
                domain: project.domains.map((domain) => domain.slug).join(","),
                endpoint: "top_links",
                interval: "30d",
              }).then((data) =>
                data
                  .slice(0, 5)
                  .map(
                    ({
                      domain,
                      key,
                      clicks,
                    }: {
                      domain: string;
                      key: string;
                      clicks: number;
                    }) => ({
                      link: linkConstructor({ domain, key, pretty: true }),
                      clicks,
                    }),
                  ),
              )
            : [],
        ]);

        const emails = project.users.map((user) => user.user.email) as string[];

        await Promise.allSettled(
          emails.map((email) => {
            limiter.schedule(() =>
              sendEmail({
                subject: `Your 30-day ${process.env.NEXT_PUBLIC_APP_NAME} summary for ${project.name}`,
                email,
                react: ClicksSummary({
                  email,
                  appName: process.env.NEXT_PUBLIC_APP_NAME as string,
                  appDomain: process.env.NEXT_PUBLIC_APP_DOMAIN as string,
                  projectName: project.name,
                  projectSlug: project.slug,
                  totalClicks: project.usage,
                  createdLinks:
                    createdLinks.status === "fulfilled"
                      ? createdLinks.value
                      : 0,
                  topLinks:
                    topLinks.status === "fulfilled" ? topLinks.value : [],
                }),
              }),
            );
          }),
        );
      }

      return await prisma.project.update({
        where: {
          id: project.id,
        },
        data: {
          usage: 0,
          sentEmails: {
            deleteMany: {
              type: {
                in: ["firstUsageLimitEmail", "secondUsageLimitEmail"],
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

const sendUsageLimitEmail = async (
  emails: string[],
  project: ProjectProps,
  type: "first" | "second",
) => {
  return await Promise.allSettled([
    emails.map((email) => {
      limiter.schedule(() =>
        sendEmail({
          subject: `You have exceeded your ${process.env.NEXT_PUBLIC_APP_NAME} usage limit`,
          email,
          react: UsageExceeded({
            email,
            project,
            type,
          }),
        }),
      );
    }),
    prisma.sentEmail.create({
      data: {
        project: {
          connect: {
            slug: project.slug,
          },
        },
        type: `${type}UsageLimitEmail`,
      },
    }),
  ]);
};
