import { limiter, receiver } from "@/lib/cron";
import { linkConstructor, log } from "@dub/utils";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkLink, recordCheck } from "./utils";
import { sendEmail } from "emails";
import MonitoringAlerts from "emails/monitoring-alerts";

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
      include: {
        users: {
          where: {
            role: "owner",
          },
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" });
    }

    const links = await prisma.link.findMany({
      where: {
        projectId: project.id,
        checkDisabled: false,
      },
      select: {
        id: true,
        domain: true,
        key: true,
        url: true,
        lastChecked: true,
      },
      orderBy: {
        lastChecked: "asc",
      },
      take: 100,
    });

    const results = await Promise.all(
      links.map(async (link) => {
        const { status, error, duration } = await checkLink(link.url);
        return {
          project_id: project.id,
          domain: link.domain,
          key: link.key,
          url: link.url,
          status,
          duration,
          error,
        };
      }),
    );

    const errors = results.filter(({ status }) => status !== 200);
    const emails = project.users.map(({ user }) => user.email) as string[];

    const response = await Promise.all([
      recordCheck(results),
      await prisma.link.updateMany({
        where: {
          id: {
            in: links.map(({ id }) => id),
          },
        },
        data: {
          lastChecked: new Date(),
        },
      }),
      errors.length > 0 &&
        emails.map((email) => {
          limiter.schedule(() =>
            sendEmail({
              subject: `Dub Monitoring Alert for ${project.name}`,
              email,
              test: true,
              react: MonitoringAlerts({
                email,
                projectName: project.name,
                projectSlug: project.slug,
                errorLinks: errors.map((error) => ({
                  ...error,
                  link: linkConstructor({
                    domain: error.domain,
                    key: error.key,
                    pretty: true,
                  }),
                })),
              }),
            }),
          );
        }),
    ]);

    return NextResponse.json(response);
  } catch (error) {
    await log({
      message: "Monitoring cron failed. Error: " + error.message,
      type: "cron",
      mention: true,
    });
    return NextResponse.json({ error: error.message });
  }
}
