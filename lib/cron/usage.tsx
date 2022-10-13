import sendMail from "emails";
import UsageExceeded from "emails/UsageExceeded";
import prisma from "@/lib/prisma";
import { getUsage } from "@/lib/upstash";
import { log } from "./utils";

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
      sentEmails: true,
    },
  });

  const response = await Promise.all(
    users.map(
      async ({
        id,
        email,
        usageLimit,
        billingCycleStart,
        projects,
        sentEmails,
      }) => {
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
          }),
        );
        let totalUsage = usageArr.reduce((acc, { usage }) => acc + usage, 0);
        let ownerExceededUsage = totalUsage > usageLimit;

        if (ownerExceededUsage) {
          await log(
            `${email} is over usage limit. Usage: ${totalUsage}, Limit: ${usageLimit}`,
          );
          const sentFirstUsageLimitEmail = sentEmails.some(
            (email) => email.type === "firstUsageLimitEmail",
          );
          if (!sentFirstUsageLimitEmail) {
            sendUsageLimitEmail(email, totalUsage, usageLimit, "first");
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
                sendUsageLimitEmail(email, totalUsage, usageLimit, "second");
              }
            }
          }
        }

        const newBillingCycle = new Date().getDate() === billingCycleStart;

        const [updateUser, updateProjects] = await Promise.all([
          prisma.user.update({
            where: {
              id,
            },
            data: {
              usage: totalUsage,
              // reset usage email warnings if it's a new billing cycle
              ...(newBillingCycle && {
                sentEmails: {
                  deleteMany: {
                    type: {
                      in: ["firstUsageLimitEmail", "secondUsageLimitEmail"],
                    },
                  },
                },
              }),
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
            }),
          ),
        ]);

        return {
          updateUser,
          updateProjects,
        };
      },
    ),
  );

  return response;
};

const sendUsageLimitEmail = async (
  email: string,
  usage: number,
  usageLimit: number,
  type: "first" | "second",
) => {
  return await Promise.all([
    sendMail({
      subject: `You have exceeded your Dub usage limit`,
      to: email,
      component: (
        <UsageExceeded usage={usage} usageLimit={usageLimit} type={type} />
      ),
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
