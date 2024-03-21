import { getAnalytics } from "@/lib/analytics";
import { qstash, receiver, sendLimitEmail } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { WorkspaceProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  APP_DOMAIN_WITH_NGROK,
  GOOGLE_FAVICON_URL,
  getApexDomain,
  log,
} from "@dub/utils";

export async function POST(req: Request) {
  const body = await req.json();
  if (process.env.VERCEL === "1") {
    const isValid = await receiver.verify({
      signature: req.headers.get("Upstash-Signature") || "",
      body: JSON.stringify(body),
    });
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const { linkId, type } = body as {
    linkId: string;
    type: "create" | "edit" | "transfer";
  };

  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
    include: {
      tags: true,
    },
  });

  if (!link) {
    return new Response("Link not found", { status: 200 });
  }

  // if the link is a dub.sh link (and is not a transfer event), do some checks
  if (link.domain === "dub.sh" && type !== "transfer") {
    const invalidFavicon = await fetch(
      `${GOOGLE_FAVICON_URL}${getApexDomain(link.url)}`,
    ).then((res) => !res.ok);

    if (invalidFavicon) {
      await log({
        message: `Suspicious link detected: ${link.domain}/${link.key} → ${link.url}`,
        type: "links",
        mention: true,
      });
    }
  }

  // for public links, delete after 30 mins (if not claimed)
  if (!link.userId) {
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/delete`,
      // delete after 30 mins
      delay: 30 * 60,
      body: {
        linkId,
      },
    });
  }

  // update redis and tinybird
  await Promise.all([
    redis.hset(link.domain, {
      [link.key.toLowerCase()]: await formatRedisLink(link),
    }),
    recordLink({ link }),
  ]);

  // increment links usage and send alert if needed
  if (type === "create" && link.projectId) {
    const workspace = await prisma.project.update({
      where: {
        id: link.projectId,
      },
      data: {
        linksUsage: {
          increment: 1,
        },
      },
    });

    const percentage = Math.round(
      (workspace.linksUsage / workspace.linksLimit) * 100,
    );

    // send alert if 80% or 100% of links limit is reached
    if (percentage === 80 || percentage === 100) {
      // check if the alert has already been sent
      const sentNotification = await prisma.sentEmail.findFirst({
        where: {
          projectId: workspace.id,
          type:
            percentage === 80
              ? "firstLinksLimitEmail"
              : "secondLinksLimitEmail",
        },
      });

      // if not, send the alert
      if (!sentNotification) {
        const users = await prisma.user.findMany({
          where: {
            projects: {
              some: {
                projectId: workspace.id,
              },
            },
          },
          select: {
            email: true,
          },
        });

        const emails = users.map(({ email }) => email) as string[];

        await Promise.all([
          sendLimitEmail({
            emails,
            workspace: workspace as unknown as WorkspaceProps,
            type:
              percentage === 80
                ? "firstLinksLimitEmail"
                : "secondLinksLimitEmail",
          }),
          log({
            message: `*${
              workspace.slug
            }* has used ${percentage.toString()}% of its links limit for the month.`,
            type: workspace.plan === "free" ? "cron" : "alerts",
            mention: workspace.plan !== "free",
          }),
        ]);
      }
    }
  }

  if (type === "transfer") {
    const oldWorkspaceId = await redis.get<string>(
      `transfer:${linkId}:oldWorkspaceId`,
    );

    const linkClicks = await getAnalytics({
      linkId,
      endpoint: "clicks",
      interval: "30d",
    });

    // update old and new project usage
    await Promise.all([
      oldWorkspaceId &&
        prisma.project.update({
          where: {
            id: oldWorkspaceId,
          },
          data: {
            usage: {
              decrement: linkClicks,
            },
            linksUsage: {
              decrement: 1,
            },
          },
        }),
      link.projectId &&
        prisma.project.update({
          where: {
            id: link.projectId,
          },
          data: {
            usage: {
              increment: linkClicks,
            },
            linksUsage: {
              increment: 1,
            },
          },
        }),
    ]);
  }

  return new Response("OK", { status: 200 });
}
