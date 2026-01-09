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

const PROGRAMS_BATCH_SIZE = 100;

const schema = z.object({
  startingAfter: z.string().optional(),
});

// GET/POST /api/cron/pending-applications-summary
// This route sends a daily summary of pending partner applications to program owners
// Runs daily at 9:00 AM UTC
export const GET = withCron(async ({ searchParams, rawBody }) => {
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

  // Get pending enrollments for all programs (we'll take top 3 per program)
  // Limit to a reasonable number to avoid fetching too many records
  // (worst case: 100 programs × 3 enrollments = 300, so 500 should be safe)
  const allPendingEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId: {
        in: programIds,
      },
      status: "pending",
    },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          country: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500, // Safety limit - should cover 100 programs with top 3 each
  });

  // Group enrollments by programId, taking only top 3 per program
  const enrollmentsByProgramMap = new Map<
    string,
    typeof allPendingEnrollments
  >();
  for (const enrollment of allPendingEnrollments) {
    if (!enrollmentsByProgramMap.has(enrollment.programId)) {
      enrollmentsByProgramMap.set(enrollment.programId, []);
    }
    const enrollments = enrollmentsByProgramMap.get(enrollment.programId)!;
    if (enrollments.length < 3) {
      enrollments.push(enrollment);
    }
  }

  // Process each program
  const emailsToSend: ResendBulkEmailOptions = [];

  for (const program of programs) {
    const totalPendingCount = pendingCountMap.get(program.id) || 0;

    if (totalPendingCount === 0) {
      continue; // Skip if no pending applications
    }

    const pendingEnrollments = enrollmentsByProgramMap.get(program.id) || [];

    // Get program owners with notification preference enabled
    const { users, ...workspace } = await getWorkspaceUsers({
      programId: program.id,
      role: WorkspaceRole.owner,
      notificationPreference: "pendingApplicationsSummary",
    });

    if (!users.length) {
      continue; // Skip if no owners with preference enabled
    }

    // Prepare applications data for email template
    const applications = pendingEnrollments.map((enrollment) => ({
      id: enrollment.partner.id,
      name: enrollment.partner.name,
      email: enrollment.partner.email || "",
      image: enrollment.partner.image,
      country: enrollment.partner.country,
    }));

    // Create email for each owner
    for (const user of users) {
      emailsToSend.push({
        variant: "notifications" as const,
        to: user.email,
        subject: `You have ${totalPendingCount} new pending application${totalPendingCount === 1 ? "" : "s"} to review`,
        react: PendingApplicationsSummary({
          email: user.email,
          workspace: {
            slug: workspace.slug,
          },
          partners: applications,
          totalCount: totalPendingCount,
          date: new Date(),
        }),
      });
    }
  }

  if (!emailsToSend.length) {
    return logAndRespond(
      "No emails to send. All programs either have no pending applications or no owners with notification preference enabled.",
    );
  }

  console.log(
    `Sending ${emailsToSend.length} pending applications summary email(s)`,
  );

  // Send emails in batches
  const emailChunks = chunk(emailsToSend, 100);

  for (const emailChunk of emailChunks) {
    const res = await sendBatchEmail(emailChunk);

    console.log(`Sent ${emailChunk.length} emails`, res);
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
