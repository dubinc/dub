import { receiver } from "#/lib/cron";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import prisma from "#/lib/prisma";
import { checkLink } from "./utils";

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
    const { projectId } = body;
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" });
    }

    const links = await prisma.link.findMany({
      where: {
        projectId: project.id,
      },
      //   orderBy: {
      //     lastChecked: "asc",
      //   },
      take: 100,
    });

    const results = await Promise.all(
      links.map(async (link) => {
        const { status, error } = await checkLink(link.url);
        return {
          projectId: project.id,
          domain: link.domain,
          key: link.key,
          url: link.url,
          status,
          error,
        };
      }),
    );

    // console.log(results);

    // await prisma.link.updateMany({
    //   where: {
    //     id: {
    //       in: links.map(({ id }) => id),
    //     },
    //   },
    //   data: {
    //     lastChecked: new Date(),
    //   },
    // });

    return NextResponse.json(results);
  } catch (error) {
    await log({
      message: "Monitoring cron failed. Error: " + error.message,
      type: "cron",
      mention: true,
    });
    return NextResponse.json({ error: error.message });
  }
}
