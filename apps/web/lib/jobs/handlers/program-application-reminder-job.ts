import { getApplicationStatusFromEnrollment } from "@/lib/partners/get-application-status-from-enrollment";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import ProgramApplicationReminder from "@dub/email/templates/program-application-reminder";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  applicationId: z.string(),
});

// Sends an email to a program application email if they haven't verified their account on Dub yet
export const programApplicationReminderJob = defineJob({
  name: "program-application-reminder-job",
  schema: inputSchema,
  async handle(input) {
    const { applicationId } = input;

    const application = await prisma.programApplication.findFirst({
      where: {
        id: applicationId,
        // Only send reminders for applications that were created less than 3 days ago
        createdAt: {
          gt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        email: true,
        enrollment: {
          select: {
            id: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            slug: true,
            supportEmail: true,
          },
        },
      },
    });

    if (!application) {
      console.info(`Application ${applicationId} not found. Skipping...`);
      return;
    }

    if (application.enrollment) {
      console.info(
        `Partner with applicationId ${application.id} has already been enrolled in program ${application.program.name}. Skipping...`,
      );
      return;
    }

    const programEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        programId: application.program.id,
        partner: {
          email: application.email,
        },
      },
      select: {
        id: true,
        partnerId: true,
        status: true,
      },
    });

    if (programEnrollment) {
      const linked = await prisma.$transaction(async (tx) => {
        // Only link if the enrollment has no application yet, otherwise the linked one is orphaned
        const { count } = await tx.programEnrollment.updateMany({
          where: {
            id: programEnrollment.id,
            applicationId: null,
          },
          data: {
            applicationId: application.id,
          },
        });

        await tx.programApplication.update({
          where: {
            id: application.id,
          },
          data: {
            partnerId: programEnrollment.partnerId,
            ...(count > 0 && {
              status: getApplicationStatusFromEnrollment(
                programEnrollment.status,
              ),
            }),
          },
        });

        return count > 0;
      });

      console.info(
        linked
          ? `Partner with email ${application.email} has already been enrolled in program ${application.program.name}. Updated applicationId to ${application.id} and skipping...`
          : `Partner with email ${application.email} has already been enrolled in program ${application.program.name} with another application. Set partnerId on application ${application.id} and skipping...`,
      );
      return;
    }

    await sendEmail({
      subject: `Complete your application for ${application.program.name}`,
      to: application.email,
      replyTo: application.program.supportEmail || "noreply",
      variant: "notifications",
      react: ProgramApplicationReminder({
        email: application.email,
        program: {
          name: application.program.name,
          slug: application.program.slug,
        },
      }),
    });

    await programApplicationReminderJob.dispatch(
      {
        applicationId: application.id,
      },
      {
        // repeat every 24 hours, but it'll be canceled if the application is more than 3 days old or is associated with a partner
        delay: 24 * 60 * 60,
      },
    );

    console.info(
      `Email sent to ${application.email} for application ${applicationId}.`,
    );
  },
});
