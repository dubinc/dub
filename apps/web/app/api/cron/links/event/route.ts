import { limiter, qstash, receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { ProjectProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  APP_DOMAIN_WITH_NGROK,
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
    type: "create" | "edit";
  };

  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link) {
    return new Response("Link not found", { status: 200 });
  }

  // if the link is a dub.sh link, do some checks
  if (link.domain === "dub.sh") {
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

  // increment links usage and send alert if needed
  if (type === "create" && link.projectId) {
    const [project, _] = await Promise.all([
      prisma.project.update({
        where: {
          id: link.projectId,
        },
        data: {
          linksUsage: {
            increment: 1,
          },
        },
      }),
      // set the index in redis again cause we don't have the linkId the first time
      redis.hset(link.domain, {
        [link.key.toLowerCase()]: await formatRedisLink(link),
      }),
    ]);

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

  return new Response("OK", { status: 200 });
}
