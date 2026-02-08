import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { sendEmail } from "@dub/email";
import WelcomeEmail from "@dub/email/templates/welcome-email";
import WelcomeEmailPartner from "@dub/email/templates/welcome-email-partner";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";

export const dynamic = "force-dynamic";

/*
    This route is used to send a welcome email to new users + subscribe them to the corresponding Resend audience
    It is called by QStash 45 minutes after a user is created.
*/
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { userId } = JSON.parse(rawBody);

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        email: true,
        partners: true,

        projects: {
          select: {
            project: {
              select: {
                slug: true,
                name: true,
                logo: true,
                plan: true,
                programs: {
                  select: {
                    slug: true,
                    name: true,
                    logo: true,
                  },
                  orderBy: {
                    createdAt: "desc",
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
        },
      },
    });

    if (!user) {
      return new Response("User not found. Skipping...", { status: 200 });
    }

    // this shouldn't happen but just in case
    if (!user.email) {
      return new Response("User email not found. Skipping...", { status: 200 });
    }

    const isPartner = user.partners.length > 0;

    const unsubscribeUrl = `${isPartner ? PARTNERS_DOMAIN : APP_DOMAIN}/unsubscribe/${generateUnsubscribeToken(user.email)}`;

    await Promise.allSettled([
      sendEmail({
        to: user.email,
        replyTo: isPartner ? "noreply" : "steven.tey@dub.co",
        subject: `Welcome to Dub${isPartner ? " Partners" : ""}!`,
        react: isPartner
          ? WelcomeEmailPartner({
              email: user.email,
              name: user.name,
              unsubscribeUrl,
            })
          : WelcomeEmail({
              email: user.email,
              workspace: user.projects?.[0]?.project,
              hasDubPartners: getPlanCapabilities(
                user.projects?.[0]?.project?.plan || "free",
              ).canManageProgram,
              program: user.projects?.[0]?.project?.programs?.[0],
              unsubscribeUrl,
            }),
        variant: "marketing",
      }),
    ]);

    return new Response("Welcome email sent and user subscribed.", {
      status: 200,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
