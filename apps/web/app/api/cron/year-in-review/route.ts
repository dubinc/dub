import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { resend } from "@dub/email/resend";
import { DubWrapped } from "@dub/email/templates/dub-wrapped";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 100;

// POST /api/cron/year-in-review
export async function POST() {
  try {
    if (process.env.VERCEL === "1") {
      return new Response("Not available in production.");
    }

    if (!resend) {
      return new Response("Resend not initialized. Skipping...");
    }

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
            id: true,
            name: true,
            slug: true,
            logo: true,
            users: {
              select: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 100,
    });

    if (yearInReviews.length === 0) {
      return new Response("No jobs found. Skipping...");
    }

    const emailData = yearInReviews.flatMap(
      ({ workspace, totalClicks, totalLinks, topCountries, topLinks }) =>
        workspace.users
          .map(({ user }) => {
            if (!user.email) {
              return null;
            }

            return {
              workspaceId: workspace.id,
              email: {
                from: "Steven from Dub.co <steven@ship.dub.co>",
                to: user.email,
                reply_to: "steven.tey@dub.co",
                subject: "Dub Year in Review 🎊",
                text: "Thank you for your support and here's to another year of your activity on Dub! Here's a look back at your activity in 2024.",
                react: DubWrapped({
                  email: user.email,
                  workspace: {
                    logo: workspace.logo,
                    name: workspace.name,
                    slug: workspace.slug,
                  },
                  stats: {
                    "Total Links": totalLinks,
                    "Total Clicks": totalClicks,
                  },
                  // @ts-ignore
                  topLinks,
                  // @ts-ignore
                  topCountries,
                }),
              },
            };
          })
          .filter((data) => data !== null),
    );

    if (emailData.length === 0) {
      return new Response("No email data found. Skipping...");
    }

    for (let i = 0; i < emailData.length; i += BATCH_SIZE) {
      const batch = emailData.slice(i, i + BATCH_SIZE);

      console.log(
        `\n🚀 Sending batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(emailData.length / BATCH_SIZE)}`,
      );

      console.log(
        `📨 Recipients:`,
        // @ts-ignore
        batch.map((b) => b.email.to),
      );

      if (batch.length === 0) {
        continue;
      }

      const { data, error } = await resend.batch.send(
        // @ts-ignore
        batch.map((b) => b.email),
      );

      console.log("🚀 ~ data:", data);
      if (error) {
        console.log("🚀 ~ error:", error);
      }
    }

    await prisma.yearInReview.updateMany({
      where: {
        id: {
          in: yearInReviews.map(({ id }) => id),
        },
      },
      data: {
        sentAt: new Date(),
      },
    });

    console.log(
      `Sent ${emailData.length} emails to ${yearInReviews.length} workspaces!`,
    );

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/year-in-review`,
      delay: 3,
      method: "POST",
      body: {},
    });

    return new Response(
      `Sent ${emailData.length} emails to ${yearInReviews.length} workspaces!`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
