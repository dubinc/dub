import sendMail from "emails";
import UsageExceeded from "emails/UsageExceeded";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { getFirstAndLastDay } from "@/lib/utils";
import { log } from "@/lib/utils";

export const updateUsage = async () => {
  const users = await prisma.user.findMany({
    where: {
      NOT: {
        projects: {
          none: {},
        },
      },
      projects: {
        some: {
          project: {
            domainVerified: true,
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      usageLimit: true,
      stripeId: true,
      billingCycleStart: true,
      projects: {
        where: {
          role: "owner",
          project: {
            domainVerified: true,
          },
        },
        select: {
          project: {
            select: {
              id: true,
              domain: true,
            },
          },
        },
      },
      sentEmails: true,
    },
    orderBy: {
      usageUpdatedAt: "asc",
    },
    take: 50,
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
        const usageArr = await Promise.all(
          projects.map(async ({ project: { id, domain } }) => {
            return {
              id,
              usage: await getUsage(domain, billingCycleStart),
            };
          }),
        );
        let totalUsage = usageArr.reduce((acc, { usage }) => acc + usage, 0);
        let ownerExceededUsage = totalUsage > usageLimit;

        if (ownerExceededUsage) {
          await log(
            `${email} is over usage limit. Usage: ${totalUsage}, Limit: ${usageLimit}`,
            "cron",
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
              usageUpdatedAt: new Date(),
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

/**
 * Get the usage for a project
 **/
const getUsage = async (
  domain: string,
  billingCycleStart: number,
): Promise<number> => {
  const { firstDay, lastDay } = getFirstAndLastDay(billingCycleStart);

  const links = await prisma.link.findMany({
    where: {
      domain,
      // only for dub.sh, pull data for owner's usage only
      ...(domain === "dub.sh" && {
        userId: process.env.DUB_OWNER_ID,
      }),
    },
    select: {
      key: true,
    },
  });
  let results: number[] = [];

  if (links.length > 0) {
    const pipeline = redis.pipeline();
    links.forEach(({ key }) => {
      pipeline.zcount(
        `${domain}:clicks:${key}`,
        firstDay.getTime(),
        lastDay.getTime(),
      );
    });
    results = await pipeline.exec();
  }
  const usage = results.reduce((acc, curr) => acc + curr, 0);
  return usage;
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
