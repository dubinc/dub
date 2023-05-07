import sendMail from "emails";
import UsageExceeded from "emails/UsageExceeded";
import prisma from "@/lib/prisma";
import { getFirstAndLastDay, log } from "@/lib/utils";
import { ProjectProps } from "../types";

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

      await log(
        `${name} is over usage limit. Usage: ${usage}, Limit: ${usageLimit}`,
        "cron",
        true,
      );
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
    sendMail({
      subject: `You have exceeded your Dub usage limit`,
      to: email,
      component: <UsageExceeded project={project} type={type} />,
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
