import { receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { importLinksFromCSV } from "./utils";

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
    const { projectId, userId, domain, count } = body;
    await importLinksFromCSV({
      projectId,
      userId,
      domain,
      count,
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
      message: `Import CSV cron for project ${
        project?.slug || body.projectId
      } failed. Error: ${error.message}`,
      type: "errors",
    });
    return NextResponse.json({ error: error.message });
  }
}
