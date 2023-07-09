import { sendEmail } from "emails";
import UsageExceeded from "emails/usage-exceeded";
import prisma from "#/lib/prisma";
import { log } from "#/lib/utils";
import { ProjectProps } from "#/lib/types";
import { getTopLinks } from "#/lib/tinybird";
import ClicksSummary from "emails/clicks-summary";

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
        where: {
          role: "owner",
        },
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
  });

  // Get all paid projects that have billingCycleStart today
  const billingReset = projects.filter(
    ({ plan, billingCycleStart }) =>
      plan !== "free" && billingCycleStart === new Date().getDate(),
  );

  // Get all projects that have exceeded usage
  const exceedingUsage = projects.filter(
    ({ usage, usageLimit }) => usage > usageLimit,
  );

  // Send email to notify overages
  const notifyOveragesResponse = await Promise.allSettled(
    exceedingUsage.map(async (project) => {
      const { name, usage, usageLimit, users, sentEmails } = project;
      const email = users[0].user.email;

      await log({
        message: `${name} is over usage limit. Usage: ${usage}, Limit: ${usageLimit}, Email: ${email}`,
        type: "cron",
        mention: true,
      });
      const sentFirstUsageLimitEmail = sentEmails.some(
        (email) => email.type === "firstUsageLimitEmail",
      );
      if (!sentFirstUsageLimitEmail) {
        // @ts-ignore
        sendUsageLimitEmail(email, project, "first");
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
            sendUsageLimitEmail(email, project, "second");
          }
        }
      }
    }),
  );

  // Reset usage for projects that have billingCycleStart today
  // also delete sentEmails for those projects
  // TODO: Monthly summary emails (total clicks, best performing links, etc.)
  const resetBillingResponse = await Promise.allSettled(
    billingReset.map(async (project) => {
      const [createdLinks, topLinks] = await Promise.allSettled([
        prisma.link.count({
          where: {
            project: {
              id: project.id,
            },
            createdAt: {
              // larger than billingCycleStart (but a month ago)
              gte: new Date(
                new Date().setDate(
                  project.billingCycleStart || new Date().getDate() - 30,
                ),
              ),
            },
          },
        }),
        getTopLinks(project.domains.map((domain) => domain.slug)),
      ]);

      const email = project.users[0].user.email as string;

      await sendEmail({
        subject: `Your 30-day Dub summary`,
        email,
        react: ClicksSummary({
          email,
          projectName: project.name,
          projectSlug: project.slug,
          totalClicks: project.usage,
          createdLinks:
            createdLinks.status === "fulfilled" ? createdLinks.value : 0,
          topLinks: topLinks.status === "fulfilled" ? topLinks.value : [],
        }),
      });

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
  email: string,
  project: ProjectProps,
  type: "first" | "second",
) => {
  return await Promise.all([
    sendEmail({
      subject: `You have exceeded your Dub usage limit`,
      email,
      react: UsageExceeded({
        email,
        project,
        type,
      }),
    }),
    prisma.sentEmail.create({
      data: {
        user: {
          connect: {
            email,
          },
        },
        type: `${type}UsageLimitEmail`,
      },
    }),
  ]);
};
