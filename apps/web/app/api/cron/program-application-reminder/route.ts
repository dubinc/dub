import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendEmail } from "@dub/email";
import ProgramApplicationReminder from "@dub/email/templates/program-application-reminder";
import { prisma } from "@dub/prisma";

// POST - /api/cron/program-application-reminder
// Sends an email if a program application hasn't received an associated partner
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { applicationId } = JSON.parse(rawBody);

    const application = await prisma.programApplication.findUnique({
      where: {
        id: applicationId,
        partner: null,
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!application)
      return new Response(
        `Application ${applicationId} without partner not found. Skipping...`,
      );

    try {
      await sendEmail({
        subject: `Complete your application to ${application.program.name}`,
        email: application.email,
        react: ProgramApplicationReminder({
          email: application.email,
          program: {
            name: application.program.name,
          },
        }),
      });

      console.log(
        `Sent application reminder email to ${application.email} for application ${applicationId}`,
      );
    } catch (e) {
      console.error(
        `Failed to send application reminder email to ${application.email} for application ${applicationId}`,
        e,
      );
      return new Response(
        `Failed to send application reminder email to ${application.email} for application ${applicationId}`,
      );
    }

    return new Response(
      `Email sent to ${application.email} for application ${applicationId}.`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
