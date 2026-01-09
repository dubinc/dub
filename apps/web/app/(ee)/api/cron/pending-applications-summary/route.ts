import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { sendBatchEmail } from "@dub/email";
import { ResendBulkEmailOptions } from "@dub/email/resend/types";
import PendingApplicationsSummary from "@dub/email/templates/pending-applications-summary";
import { prisma } from "@dub/prisma";
import { WorkspaceRole } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const PROGRAMS_BATCH_SIZE = 1;

const schema = z.object({
  startingAfter: z.string().optional(),
});

// GET/POST /api/cron/pending-applications-summary
// This route sends a daily summary of pending partner applications to program owners
// Runs daily at 9:00 AM UTC
export const GET = withCron(async ({ rawBody }) => {
  let { startingAfter } = schema.parse(
    rawBody ? JSON.parse(rawBody) : { startingAfter: undefined },
  );

  // Get batch of programs with pending applications
  const programs = await prisma.program.findMany({
    where: {
      partners: {
        some: {
          status: "pending",
        },
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
    take: PROGRAMS_BATCH_SIZE,
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
    orderBy: {
      id: "asc",
    },
  });

  if (!programs.length) {
    return logAndRespond(
      "No more programs with pending applications found. Skipping...",
    );
  }

  const programIds = programs.map((p) => p.id);

  // Get top 3 pending enrollments per program in parallel
  // This ensures we get the top 3 from each program regardless of how many pending enrollments they have
  const enrollmentsByProgramMap = new Map<
    string,
    Array<{
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    }>
  >();

  await Promise.all(
    programIds.map(async (programId) => {
      const enrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          status: "pending",
        },
        select: {
          partner: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      });

      if (enrollments.length > 0) {
        enrollmentsByProgramMap.set(
          programId,
          enrollments.map((e) => ({
            id: e.partner.id,
            name: e.partner.name,
            email: e.partner.email,
            image: e.partner.image,
          })),
        );
      }
    }),
  );

  // Get counts of pending enrollments per program
  const pendingCounts = await prisma.programEnrollment.groupBy({
    by: ["programId"],
    where: {
      programId: {
        in: programIds,
      },
      status: "pending",
    },
    _count: true,
  });

  // Create a map of programId -> count
  const pendingCountMap = new Map(
    pendingCounts.map((pc) => [pc.programId, pc._count]),
  );

  // Process each program
  const emailsToSend: ResendBulkEmailOptions = [];

  for (const program of programs) {
    const totalPendingApplications = pendingCountMap.get(program.id) || 0;

    if (totalPendingApplications === 0) {
      continue;
    }

    const pendingEnrollments = enrollmentsByProgramMap.get(program.id) || [];

    // Get program owners with notification preference enabled
    const { users, ...workspace } = await getWorkspaceUsers({
      programId: program.id,
      role: WorkspaceRole.owner,
      notificationPreference: "pendingApplicationsSummary",
    });

    if (!users.length) {
      continue;
    }

    // Create email for each owner
    for (const user of users) {
      emailsToSend.push({
        variant: "notifications",
        to: user.email,
        subject: `You have ${totalPendingApplications} new pending application${totalPendingApplications === 1 ? "" : "s"} to review`,
        react: PendingApplicationsSummary({
          email: user.email,
          partners: pendingEnrollments,
          totalCount: totalPendingApplications,
          date: new Date(),
          workspace: {
            slug: workspace.slug,
          },
        }),
      });
    }
  }

  if (!emailsToSend.length) {
    return logAndRespond(
      "No emails to send. All programs either have no pending applications or no owners with notification preference enabled.",
    );
  }

  // Send email in batches
  const emailChunks = chunk(emailsToSend, 100);
  for (const emailChunk of emailChunks) {
    await sendBatchEmail(emailChunk);
  }

  // Schedule the next batch if there are more programs to process
  if (programs.length === PROGRAMS_BATCH_SIZE) {
    startingAfter = programs[programs.length - 1].id;

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/pending-applications-summary`,
      method: "POST",
      body: {
        startingAfter,
      },
    });

    return logAndRespond(
      `Sent ${emailsToSend.length} emails and scheduled next batch (startingAfter: ${startingAfter}).`,
    );
  }

  return logAndRespond(
    `Successfully sent ${emailsToSend.length} pending applications summary email(s).`,
  );
});

export const POST = GET;
