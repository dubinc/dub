import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendEmail } from "@dub/email";
import ProgramApplicationReminder from "@dub/email/templates/program-application-reminder";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils/src/constants";

// POST - /api/cron/program-application-reminder
// Sends an email if a program application hasn't received an associated partner
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { applicationId } = JSON.parse(rawBody);

    const application = await prisma.programApplication.findFirst({
      where: {
        id: applicationId,
        enrollment: null,
        // Only send reminders for applications that were created less than 3 days ago
        createdAt: {
          gt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!application)
      return new Response(
        `Application ${applicationId} without partner not found. Skipping...`,
      );

    await sendEmail({
      subject: `Complete your application for ${application.program.name}`,
      email: application.email,
      react: ProgramApplicationReminder({
        email: application.email,
        program: {
          name: application.program.name,
          slug: application.program.slug,
        },
      }),
    });

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/program-application-reminder`,
      // repeat every 24 hours, but it'll be cancelled if the application is more than 3 days old or is associated with a partner
      delay: 24 * 60 * 60 * 1000,
      body: {
        applicationId: application.id,
      },
    });

    return new Response(
      `Email sent to ${application.email} for application ${applicationId}.`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
