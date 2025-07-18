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
        // Only send reminders for applications that were created less than 3 days ago
        createdAt: {
          gt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        enrollment: true,
        program: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!application) {
      return new Response(
        `Application ${applicationId} not found. Skipping...`,
      );
    }

    if (application.enrollment) {
      return new Response(
        `Partner with applicationId ${application.id} has already been enrolled in program ${application.program.name}. Skipping...`,
      );
    }

    const programEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        programId: application.program.id,
        partner: {
          email: application.email,
        },
      },
    });

    if (programEnrollment) {
      await prisma.programEnrollment.update({
        where: {
          id: programEnrollment.id,
        },
        data: {
          applicationId: application.id,
        },
      });

      return new Response(
        `Partner with email ${application.email} has already been enrolled in program ${application.program.name}. Updated applicationId to ${application.id} and skipping...`,
      );
    }

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
      variant: "notifications",
    });

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/program-application-reminder`,
      // repeat every 24 hours, but it'll be cancelled if the application is more than 3 days old or is associated with a partner
      delay: 24 * 60 * 60,
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
