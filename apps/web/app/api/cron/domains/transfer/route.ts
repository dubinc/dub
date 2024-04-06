import { getAnalytics } from "@/lib/analytics";
import { setRootDomain } from "@/lib/api/domains";
import { qstash, receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { formatRedisLink, redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { Link } from "@prisma/client";
import { NextResponse } from "next/server";

const schema = z.object({
  currentWorkspaceId: z.string(),
  newWorkspaceId: z.string(),
  domain: z.string(),
});

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

  const { currentWorkspaceId, newWorkspaceId, domain } = schema.parse(body);

  const [newWorkspace, domainRecord, links] = await Promise.all([
    prisma.project.findUniqueOrThrow({
      where: { id: newWorkspaceId },
      select: { plan: true },
    }),
    prisma.domain.findUniqueOrThrow({
      where: { slug: domain },
      select: {
        id: true,
        target: true,
        type: true,
      },
    }),
    prisma.link.findMany({
      where: { domain, projectId: currentWorkspaceId },
      take: 100,
    }),
  ]);

  if (!links || links.length === 0) {
    return NextResponse.json({
      response: "success",
    });
  }

  const linksCount = links.length;
  const linkIds = links.map((link) => link.id);

  try {
    // Update links in the redis
    const updateLinksInRedis = async (links: Link[]) => {
      const pipeline = redis.pipeline();

      const formatedLinks = await Promise.all(
        links.map(async (link) => {
          return {
            ...(await formatRedisLink(link)),
            projectId: newWorkspaceId,
            key: link.key.toLowerCase(),
          };
        }),
      );

      formatedLinks.map((formatedLink) => {
        const { key, ...rest } = formatedLink;

        pipeline.hset(domain, {
          [formatedLink.key]: rest,
        });
      });

      await pipeline.exec();
    };

    // Update analytics
    const updateAnalytics = async (links: Link[]) => {
      const linkClicks = (await Promise.all(
        links.map((link) =>
          getAnalytics({
            linkId: link.id,
            endpoint: "clicks",
            interval: "30d",
          }),
        ),
      )) as number[];

      const totalLinkClicks = linkClicks.reduce((acc, curr) => acc + curr, 0);

      await Promise.all([
        prisma.project.update({
          where: {
            id: currentWorkspaceId,
          },
          data: {
            usage: {
              decrement: totalLinkClicks,
            },
            linksUsage: {
              decrement: linksCount,
            },
          },
        }),
        prisma.project.update({
          where: {
            id: newWorkspaceId,
          },
          data: {
            usage: {
              increment: totalLinkClicks,
            },
            linksUsage: {
              increment: linksCount,
            },
          },
        }),
      ]);
    };

    await Promise.all([
      prisma.link.updateMany({
        where: { domain, projectId: currentWorkspaceId, id: { in: linkIds } },
        data: { projectId: newWorkspaceId },
      }),
      prisma.linkTag.deleteMany({
        where: { linkId: { in: linkIds } },
      }),
      updateLinksInRedis(links),
      setRootDomain({
        id: domainRecord.id,
        domain,
        projectId: newWorkspaceId,
        ...(newWorkspace.plan !== "free" &&
          domainRecord.target && {
            url: domainRecord.target,
          }),
        rewrite: domainRecord.type === "rewrite",
      }),
      updateAnalytics(links),
    ]);

    // wait 500 ms before making another request
    await new Promise((resolve) => setTimeout(resolve, 500));

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/transfer`,
      body: {
        currentWorkspaceId,
        newWorkspaceId,
        domain,
      },
    });

    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: `Domain transfer cron for the workspace ${newWorkspaceId} failed. Error: ${error.message}`,
      type: "errors",
    });

    return NextResponse.json({ error: error.message });
  }

  // TODO:
  // Update TB
  // Send email
}
