import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { resend } from "@/lib/resend";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import DubWrapped from "emails/dub-wrapped";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 1;

// POST /api/cron/year-in-review
export async function POST(req: Request) {
  try {
    const body = await req.json();
    await verifyQstashSignature(req, body);

    const yearInReviews = await prisma.yearInReview.findMany({
      where: {
        sentAt: null,
        year: 2024,
      },
      select: {
        id: true,
        workspaceId: true,
        topCountries: true,
        topLinks: true,
        totalClicks: true,
        totalLinks: true,
        workspace: {
          select: {
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
      take: BATCH_SIZE,
    });

    if (yearInReviews.length === 0) {
      return new Response("No jobs found. Skipping...");
    }

    const workspaceUsers = await prisma.projectUsers.findMany({
      where: {
        projectId: {
          in: yearInReviews.map(({ workspaceId }) => workspaceId),
        },
        user: {
          email: {
            not: null,
          },
        },
      },
      select: {
        projectId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const emailData = workspaceUsers
      .map(({ projectId, user }) => {
        const yearInReview = yearInReviews.find(
          ({ workspaceId }) => workspaceId === projectId,
        );

        const workspace = yearInReview?.workspace;

        if (!workspace || !user.email) {
          return null;
        }

        return {
          workspaceId: projectId,
          email: {
            from: "Steven Tey <steven@dub.co>",
            to: user.email,
            replyToFromEmail: true,
            subject: "Dub Year in Review 🎊",
            text: "Thank you for your support and here's to another year of your activity on Dub! Here's a look back at your activity in 2024.",
            react: DubWrapped({
              email: user.email!,
              workspace: {
                logo: workspace.logo!,
                name: workspace.name,
                slug: workspace.slug,
              },
              stats: {
                "Total Links": yearInReview.totalLinks,
                "Total Clicks": yearInReview.totalClicks,
              },
              // @ts-ignore
              topLinks: yearInReview.topLinks,
              // @ts-ignore
              topCountries: yearInReview.topCountries,
            }),
          },
        };
      })
      .filter((data) => data !== null);

    if (emailData.length === 0) {
      return new Response("No email data found. Skipping...");
    }

    if (!resend) {
      return new Response("Resend not initialized. Skipping...");
    }

    for (let i = 0; i < emailData.length; i += BATCH_SIZE) {
      const batch = emailData.slice(i, i + BATCH_SIZE);

      console.log(
        `\n🚀 Sending batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(emailData.length / BATCH_SIZE)}`,
      );

      console.log(
        `📨 Recipients:`,
        batch.map((b) => b?.email),
      );

      if (batch.length === 0) {
        continue;
      }

      const { data, error } = await resend.batch.send(
        batch.map((b) => b?.email),
      );

      console.log("🚀 ~ error:", error);
      console.log("🚀 ~ data:", data);

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // TODO:
    // Error handling

    await prisma.yearInReview.updateMany({
      where: {
        workspaceId: {
          in: yearInReviews.map(({ workspaceId }) => workspaceId),
        },
      },
      data: {
        sentAt: new Date(),
      },
    });

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/year-in-review`,
      delay: 5,
      method: "POST",
      body: {},
    });

    return new Response("Jobs sent.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
