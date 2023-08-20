import { sendEmail } from "emails";
import UsageExceeded from "emails/usage-exceeded";
import prisma from "#/lib/prisma";
import { log } from "#/lib/utils";
import { ProjectProps } from "#/lib/types";
import { getTopLinks } from "#/lib/tinybird";
import ClicksSummary from "emails/clicks-summary";
import { limiter } from "#/lib/cron";

export const updateUsage = async () => {
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
  });

  // Reset billing cycles for projects that:
  // - Are not on the free plan
  // - Are on the free plan but have not exceeded usage
  // - Have billingCycleStart today
  const billingReset = projects.filter(
    ({ usage, usageLimit, plan, billingCycleStart }) =>
      !(plan === "free" && usage > usageLimit) &&
      billingCycleStart === new Date().getDate(),
  );

  // Get all projects that have exceeded usage
  const exceedingUsage = projects.filter(
    ({ usage, usageLimit }) => usage > usageLimit,
  );

  // Send email to notify overages
  const notifyOveragesResponse = await Promise.allSettled(
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
  const resetBillingResponse = await Promise.allSettled(
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
          getTopLinks(project.domains.map((domain) => domain.slug)),
        ]);

        const emails = project.users.map((user) => user.user.email) as string[];

        await Promise.allSettled(
          emails.map((email) => {
            limiter.schedule(() =>
              sendEmail({
                subject: `Your 30-day Dub summary for ${project.name}`,
                email,
                react: ClicksSummary({
                  email,
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

  return {
    billingReset,
    exceedingUsage,
    notifyOveragesResponse,
    resetBillingResponse,
  };
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
          subject: `You have exceeded your Dub usage limit`,
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
