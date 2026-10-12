import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import ProgramApplicationReminder from "@dub/email/templates/program-application-reminder";
import { WorkspaceEnvironment } from "@prisma/client";
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
        program: {
          environment: WorkspaceEnvironment.production,
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
      },
    });

    if (programEnrollment) {
      console.info(
        `Partner with email ${application.email} is already enrolled in program ${application.program.name}. Skipping reminder...`,
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
