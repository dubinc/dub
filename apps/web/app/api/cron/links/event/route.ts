import { getAnalytics } from "@/lib/analytics";
import { limiter, qstash, receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { ProjectProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  APP_DOMAIN_WITH_NGROK,
  DUB_THUMBNAIL,
  GOOGLE_FAVICON_URL,
  getApexDomain,
  log,
} from "@dub/utils";
import { sendEmail } from "emails";
import LinksLimitAlert from "emails/links-limit";

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
    if (link.image === DUB_THUMBNAIL) {
      await prisma.link.update({
        where: {
          id: link.id,
        },
        data: {
          image: `https://${process.env.STORAGE_DOMAIN}/images/${link.id}`,
        },
      });
    }
    const project = await prisma.project.update({
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
      (project.linksUsage / project.linksLimit) * 100,
    );

    if (percentage === 80 || percentage === 100) {
      const users = await prisma.user.findMany({
        where: {
          projects: {
            some: {
              projectId: project.id,
            },
          },
        },
        select: {
          email: true,
        },
      });

      const emails = users.map(({ email }) => email) as string[];

      await Promise.allSettled([
        emails.map((email) => {
          limiter.schedule(() =>
            sendEmail({
              subject: `${process.env.NEXT_PUBLIC_APP_NAME} Alert: ${
                project.name
              } has used ${percentage.toString()}% of its links limit for the month.`,
              email,
              react: LinksLimitAlert({
                email,
                project: project as Partial<ProjectProps>,
              }),
            }),
          );
        }),
        log({
          message: `*${
            project.slug
          }* has used ${percentage.toString()}% of its links limit for the month.`,
          type: project.plan === "free" ? "cron" : "alerts",
          mention: project.plan !== "free",
        }),
      ]);
    }
  }

  if (type === "transfer") {
    const oldProjectId = await redis.get<string>(
      `transfer:${linkId}:oldProjectId`,
    );

    const linkClicks = await getAnalytics({
      linkId,
      endpoint: "clicks",
      interval: "30d",
    });

    // update old and new project usage
    await Promise.all([
      oldProjectId &&
        prisma.project.update({
          where: {
            id: oldProjectId,
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
