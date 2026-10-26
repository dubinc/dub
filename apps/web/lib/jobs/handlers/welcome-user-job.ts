import { generateUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import WelcomeEmail from "@dub/email/templates/welcome-email";
import { APP_DOMAIN } from "@dub/utils";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  userId: z.string(),
});

// This job is used to send a welcome email to new users + subscribe them to the corresponding Resend audience
// It is dispatched 45 minutes after a user is created.

// Trial sequence: users who later start a paid-plan trial also receive marketing emails from
// `/api/cron/trial-emails` when due; that flow is additive (this welcome is not skipped).
export const welcomeUserJob = defineJob({
  name: "welcome-user-job",
  schema: inputSchema,
  async handle(input) {
    const { userId } = input;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        email: true,
        projects: {
          select: {
            project: {
              select: {
                slug: true,
                name: true,
                logo: true,
                plan: true,
                trialEndsAt: true,
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
      console.error(`User ${userId} not found.`);
      return;
    }

    if (!user.email) {
      console.error(`User ${userId} email not found.`);
      return;
    }

    const unsubscribeUrl = `${APP_DOMAIN}/unsubscribe/${generateUnsubscribeToken(user.email)}`;

    // only send WelcomeEmail if the user has a workspace that is not in a trial
    if (
      user.projects.length > 0 &&
      user.projects[0].project.trialEndsAt === null
    ) {
      await sendEmail({
        variant: "marketing",
        to: user.email,
        replyTo: "steven.tey@dub.co",
        subject: "Welcome to Dub!",
        react: WelcomeEmail({
          email: user.email,
          workspace: user.projects[0].project,
          unsubscribeUrl,
        }),
      });
    }
  },
});
