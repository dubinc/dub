import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { sendBatchEmail } from "@dub/email";
import { ResendBulkEmailOptions } from "@dub/email/resend/types";
import PendingApplicationsSummary from "@dub/email/templates/pending-applications-summary";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const PROGRAMS_BATCH_SIZE = 50;

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

  // Get top 3 pending enrollments per program using SQL window function
  // This efficiently gets only the top 3 from each program directly from the database
  const topEnrollments = await prisma.$queryRaw<
    Array<{
      programId: string;
      partnerId: string;
      partnerName: string | null;
      partnerEmail: string | null;
      partnerImage: string | null;
    }>
  >(Prisma.sql`
    SELECT 
      pe.programId,
      p.id as partnerId,
      p.name as partnerName,
      p.email as partnerEmail,
      p.image as partnerImage
    FROM (
      SELECT 
        id,
        programId,
        partnerId,
        ROW_NUMBER() OVER (PARTITION BY programId ORDER BY createdAt DESC) as rn
      FROM ProgramEnrollment
      WHERE programId IN (${Prisma.join(programIds)})
        AND status = 'pending'
    ) ranked
    INNER JOIN ProgramEnrollment pe ON pe.id = ranked.id
    INNER JOIN Partner p ON p.id = pe.partnerId
    WHERE ranked.rn <= 3
    ORDER BY pe.programId, pe.createdAt DESC
  `);

  // Group enrollments by programId
  const enrollmentsByProgramMap = new Map<
    string,
    Array<{
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    }>
  >();

  for (const enrollment of topEnrollments) {
    const existing = enrollmentsByProgramMap.get(enrollment.programId) || [];
    enrollmentsByProgramMap.set(enrollment.programId, [
      ...existing,
      {
        id: enrollment.partnerId,
        name: enrollment.partnerName,
        email: enrollment.partnerEmail,
        image: enrollment.partnerImage,
      },
    ]);
  }

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

  const workspaceUsers = await prisma.projectUsers.findMany({
    where: {
      project: {
        defaultProgramId: {
          in: programIds,
        },
      },
      notificationPreference: {
        pendingApplicationsSummary: true,
      },
      user: {
        email: {
          not: null,
        },
      },
    },
    select: {
      project: {
        select: {
          slug: true,
          defaultProgramId: true,
        },
      },
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  // create a map of programId -> workspace users
  const programWorkspaceUsersMap = new Map<
    string,
    {
      users: {
        email: string;
      }[];
      workspace: {
        slug: string;
      };
    }
  >();

  for (const workspaceUser of workspaceUsers) {
    const programId = workspaceUser.project.defaultProgramId!; // coerce since we filtered above
    const workspaceUserEmail = workspaceUser.user.email!; // coerce since we filtered above
    const existingData = programWorkspaceUsersMap.get(programId);
    if (existingData) {
      existingData.users.push({
        email: workspaceUserEmail,
      });
    } else {
      programWorkspaceUsersMap.set(programId, {
        users: [
          {
            email: workspaceUserEmail,
          },
        ],
        workspace: {
          slug: workspaceUser.project.slug,
        },
      });
    }
  }

  // Process each program
  const emailsToSend: ResendBulkEmailOptions = [];

  for (const program of programs) {
    const totalPendingApplications = pendingCountMap.get(program.id) || 0;

    if (totalPendingApplications === 0) {
      continue;
    }

    const pendingEnrollments = enrollmentsByProgramMap.get(program.id) || [];

    const { users, workspace } = programWorkspaceUsersMap.get(program.id) || {};

    if (!users || !workspace) {
      continue;
    }

    // Create email for each owner
    for (const user of users) {
      emailsToSend.push({
        variant: "notifications",
        to: user.email,
        subject: `You have ${totalPendingApplications} partner application${totalPendingApplications === 1 ? "" : "s"} pending review`,
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

    const response = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/pending-applications-summary`,
      method: "POST",
      body: {
        startingAfter,
      },
    });

    return logAndRespond(
      `Sent ${emailsToSend.length} emails and scheduled next batch (startingAfter: ${startingAfter}, messageId: ${response.messageId}).`,
    );
  }

  return logAndRespond(
    `Successfully sent ${emailsToSend.length} pending applications summary email(s).`,
  );
});

export const POST = GET;
