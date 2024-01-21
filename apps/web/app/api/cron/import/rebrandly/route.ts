import { receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { importLinksFromRebrandly, importTagsFromRebrandly } from "./utils";

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

  try {
    const { projectId, importTags } = body;
    const rebrandlyApiKey = await redis.get<string>(
      `import:rebrandly:${projectId}`,
    );

    if (!rebrandlyApiKey) {
      throw new Error("No Rebrandly API key found");
    }

    let tagsToId: Record<string, string> | null = null;
    if (importTags === true) {
      const tagsImported = await redis.get(
        `import:rebrandly:${projectId}:tags`,
      );

      if (!tagsImported) {
        await importTagsFromRebrandly({
          projectId,
          rebrandlyApiKey,
        });

        await redis.set(`import:rebrandly:${projectId}:tags`, "true");
      }

      tagsToId = await prisma.tag
        .findMany({
          where: {
            projectId,
          },
          select: {
            id: true,
            name: true,
          },
        })
        .then((tags) =>
          tags.reduce((acc, tag) => {
            acc[tag.name] = tag.id;
            return acc;
          }, {}),
        );
    }
    await importLinksFromRebrandly({
      ...body,
      tagsToId,
      rebrandlyApiKey,
    });
    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    const project = await prisma.project.findUnique({
      where: {
        id: body.projectId,
      },
      select: {
        slug: true,
      },
    });

    await log({
      message: `Import Rebrandly cron for project ${
        project?.slug || body.projectId
      } failed. Error: ${error.message}`,
      type: "errors",
    });
    return NextResponse.json({ error: error.message });
  }
}
