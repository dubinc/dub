import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendEmail } from "@dub/email";
import { subscribe } from "@dub/email/resend/subscribe";
import WelcomeEmail from "@dub/email/templates/welcome-email";
import WelcomeEmailPartner from "@dub/email/templates/welcome-email-partner";
import { prisma } from "@dub/prisma";

export const dynamic = "force-dynamic";

/*
    This route is used to send a welcome email to new users + subscribe them to the corresponding Resend audience
    It is called by QStash 15 minutes after a user is created.
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

    await Promise.all([
      subscribe({
        email: user.email,
        name: user.name || undefined,
        audience: isPartner ? "partners.dub.co" : "app.dub.co",
      }),
      sendEmail({
        email: user.email,
        replyTo: "steven.tey@dub.co",
        subject: `Welcome to Dub${isPartner ? " Partners" : ""}!`,
        react: isPartner
          ? WelcomeEmailPartner({
              email: user.email,
              name: user.name,
            })
          : WelcomeEmail({
              email: user.email,
              name: user.name,
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
