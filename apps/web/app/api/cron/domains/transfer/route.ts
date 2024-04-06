import { qstash, receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
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

  const links = await prisma.link.findMany({
    where: { domain, projectId: currentWorkspaceId },
    take: 100,
  });

  if (!links || links.length === 0) {
    return NextResponse.json({
      response: "success",
    });
  }

  const linksCount = links.length;

  // Object.entries(linksByDomain).forEach(([domain, links]) => {
  //   pipeline.hdel(domain, ...links);
  // });

  // [link.key.toLowerCase()]: {
  //   ...(await formatRedisLink(link)),
  //   projectId: LEGAL_WORKSPACE_ID,
  // },

  try {
    const updateLinksInRedis = async (links: Link[]) => {
      const pipeline = redis.pipeline();

      links.forEach((link) =>
        pipeline.hset(domain, {
          [link.key.toLowerCase()]: {
            // ...(await formatRedisLink(link)),
            projectId: newWorkspaceId,
          },
        }),
      );

      pipeline.exec();
    };

    await Promise.allSettled([
      prisma.link.updateMany({
        where: { domain, projectId: currentWorkspaceId },
        data: { projectId: newWorkspaceId },
      }),
      prisma.project.update({
        where: { id: currentWorkspaceId },
        data: {
          linksUsage: {
            decrement: linksCount,
          },
        },
      }),
      prisma.project.update({
        where: { id: newWorkspaceId },
        data: {
          linksUsage: {
            increment: linksCount,
          },
        },
      }),
      updateLinksInRedis(links)
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
  } catch (error) {
    await log({
      message: `Domain transfer cron for the workspace ${newWorkspaceId} failed. Error: ${error.message}`,
      type: "errors",
    });

    return NextResponse.json({ error: error.message });
  }

  // TODO:
  // Update redis
  // Update TB
  // Update analytics
}
