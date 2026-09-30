import { getAuditLogs } from "@/lib/api/audit-logs/get-audit-logs";
import { getApplicationStatusFromEnrollment } from "@/lib/partners/get-application-status-from-enrollment";
import { prisma } from "@/lib/prisma";
import { ProgramApplicationStatus } from "@prisma/client";
import "dotenv-flow/config";

const DRY_RUN = true;
const BATCH_SIZE = 500;

// Max gap between an application's reviewedAt and the activity log written by the same review
const REVIEW_LOG_MATCH_WINDOW_MS = 10 * 60 * 1000;

// Approve/reject wrote Tinybird audit logs until #3746 (2026-04-13) replaced them with ActivityLog rows
const ACTIVITY_LOGS_INTRODUCED_AT = new Date("2026-04-14");

const REVIEW_LOG_ACTIONS = {
  "partner_application.approved": ProgramApplicationStatus.approved,
  "partner_application.rejected": ProgramApplicationStatus.rejected,
} as const;

type ReviewLogAction = keyof typeof REVIEW_LOG_ACTIONS;

function isReviewLogAction(action: string): action is ReviewLogAction {
  return action in REVIEW_LOG_ACTIONS;
}

// Returns the decision of the review log closest to reviewedAt, within the match window
function findClosestDecision(
  logs: { action: string; createdAt: Date }[],
  reviewedAt: Date,
) {
  let closest: { action: ReviewLogAction; gap: number } | null = null;

  for (const log of logs) {
    if (!isReviewLogAction(log.action)) {
      continue;
    }

    const gap = Math.abs(log.createdAt.getTime() - reviewedAt.getTime());

    if (gap <= REVIEW_LOG_MATCH_WINDOW_MS && (!closest || gap < closest.gap)) {
      closest = {
        action: log.action,
        gap,
      };
    }
  }

  return closest ? REVIEW_LOG_ACTIONS[closest.action] : null;
}

// Tinybird returns DateTime64 as "YYYY-MM-DD HH:mm:ss.SSS" in UTC, without a timezone suffix
function parseTinybirdTimestamp(timestamp: string) {
  return new Date(
    /[zZ]|[+-]\d{2}:?\d{2}$/.test(timestamp)
      ? timestamp
      : `${timestamp.replace(" ", "T")}Z`,
  );
}

function getAuditLogPartnerId(targets: string) {
  try {
    const parsed = JSON.parse(targets) as { type?: string; id?: string }[];
    return parsed.find(({ type }) => type === "partner")?.id ?? null;
  } catch {
    return null;
  }
}

// Pass 1: applications linked to an enrollment take their status and partnerId from it
async function backfillFromEnrollments() {
  console.log("Pass 1: applications with an enrollment");

  const totals = {
    scanned: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    partnerIds: 0,
  };

  let cursor: string | undefined;

  while (true) {
    const applications = await prisma.programApplication.findMany({
      where: {
        enrollment: {
          isNot: null,
        },
      },
      select: {
        id: true,
        partnerId: true,
        status: true,
        enrollment: {
          select: {
            partnerId: true,
            status: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
    });

    if (applications.length === 0) {
      break;
    }

    totals.scanned += applications.length;
    cursor = applications[applications.length - 1].id;

    const idsByStatus: Record<ProgramApplicationStatus, string[]> = {
      pending: [],
      approved: [],
      rejected: [],
    };

    const partnerIdUpdates: { id: string; partnerId: string }[] = [];

    for (const application of applications) {
      const { enrollment } = application;

      if (!enrollment) {
        continue;
      }

      const status = getApplicationStatusFromEnrollment(enrollment.status);

      // If status mismatch, update the status
      if (
        application.status === ProgramApplicationStatus.pending &&
        status !== ProgramApplicationStatus.pending
      ) {
        idsByStatus[status].push(application.id);
      }

      // If partnerId is missing, set it from the enrollment
      if (!application.partnerId) {
        partnerIdUpdates.push({
          id: application.id,
          partnerId: enrollment.partnerId,
        });
      }
    }

    for (const status of Object.values(ProgramApplicationStatus)) {
      const ids = idsByStatus[status];

      if (ids.length === 0) {
        continue;
      }

      if (DRY_RUN) {
        totals[status] += ids.length;
        continue;
      }

      const { count } = await prisma.programApplication.updateMany({
        where: {
          id: {
            in: ids,
          },
          status: ProgramApplicationStatus.pending,
        },
        data: {
          status,
        },
      });

      totals[status] += count;
    }

    if (partnerIdUpdates.length > 0) {
      if (!DRY_RUN) {
        await prisma.$transaction(
          partnerIdUpdates.map(({ id, partnerId }) =>
            prisma.programApplication.update({
              where: {
                id,
              },
              data: {
                partnerId,
              },
            }),
          ),
        );
      }

      totals.partnerIds += partnerIdUpdates.length;
    }

    console.log(
      `${DRY_RUN ? "Would process" : "Processed"} ${applications.length} applications up to ${cursor}`,
    );
  }

  console.table(totals);
}

// Pass 2: applications without an enrollment that carry a rejection reason or note were rejected
async function backfillRejectedFromRejectionFields() {
  console.log(
    "Pass 2: applications without an enrollment and a rejection reason or note",
  );

  const totals = {
    scanned: 0,
    rejected: 0,
  };

  let cursor: string | undefined;

  while (true) {
    const applications = await prisma.programApplication.findMany({
      where: {
        enrollment: null,
        status: ProgramApplicationStatus.pending,
        OR: [
          {
            rejectionReason: {
              not: null,
            },
          },
          {
            rejectionNote: {
              not: null,
            },
          },
        ],
      },
      select: {
        id: true,
        rejectionReason: true,
        rejectionNote: true,
        reviewedAt: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
    });

    if (applications.length === 0) {
      break;
    }

    totals.scanned += applications.length;
    cursor = applications[applications.length - 1].id;

    console.table(applications.slice(0, 20));

    if (DRY_RUN) {
      totals.rejected += applications.length;
    } else {
      const { count } = await prisma.programApplication.updateMany({
        where: {
          id: {
            in: applications.map(({ id }) => id),
          },
          status: ProgramApplicationStatus.pending,
        },
        data: {
          status: ProgramApplicationStatus.rejected,
        },
      });

      totals.rejected += count;
    }

    console.log(
      `${DRY_RUN ? "Would process" : "Processed"} ${applications.length} applications up to ${cursor}`,
    );
  }

  console.table(totals);
}

// Match on the registered user's email (verified at login), not Partner.email,
// which importers and the partners API can set on partners nobody has claimed
async function getPartnerIdsByEmail(emails: string[]) {
  const uniqueEmails = [...new Set(emails.map((email) => email.toLowerCase()))];

  if (uniqueEmails.length === 0) {
    return new Map<string, string>();
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: uniqueEmails,
      },
      partners: {
        some: {},
      },
    },
    select: {
      email: true,
      partners: {
        select: {
          partnerId: true,
        },
        take: 1,
      },
    },
  });

  return new Map(
    users
      .filter((user) => user.email && user.partners.length > 0)
      .map((user) => [user.email!.toLowerCase(), user.partners[0].partnerId]),
  );
}

// Pass 3: applications without an enrollment get their partnerId from a registered partner with the same email
async function backfillPartnerIdsByEmail() {
  console.log("Pass 3: partnerId for applications without an enrollment");

  const totals = {
    scanned: 0,
    partnerIds: 0,
  };

  let cursor: string | undefined;

  while (true) {
    const applications = await prisma.programApplication.findMany({
      where: {
        enrollment: null,
        partnerId: null,
      },
      select: {
        id: true,
        email: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
    });

    if (applications.length === 0) {
      break;
    }

    totals.scanned += applications.length;
    cursor = applications[applications.length - 1].id;

    const partnerIdByEmail = await getPartnerIdsByEmail(
      applications.map(({ email }) => email),
    );

    const partnerIdUpdates = applications.flatMap(({ id, email }) => {
      const partnerId = partnerIdByEmail.get(email.toLowerCase());
      return partnerId ? [{ id, email, partnerId }] : [];
    });

    if (partnerIdUpdates.length > 0) {
      console.table(partnerIdUpdates.slice(0, 20));

      if (!DRY_RUN) {
        await prisma.$transaction(
          partnerIdUpdates.map(({ id, partnerId }) =>
            prisma.programApplication.update({
              where: {
                id,
              },
              data: {
                partnerId,
              },
            }),
          ),
        );
      }

      totals.partnerIds += partnerIdUpdates.length;
    }

    console.log(
      `${DRY_RUN ? "Would process" : "Processed"} ${applications.length} applications up to ${cursor}`,
    );
  }

  console.table(totals);
}

// Pass 4: reviewed applications without an enrollment take the decision from the activity log
// written by the same review (matched by programId, partnerId, and closest to reviewedAt)
async function backfillFromActivityLogs() {
  console.log(
    "Pass 4: reviewed applications without an enrollment, from the activity log",
  );

  const totals = {
    scanned: 0,
    approved: 0,
    rejected: 0,
    noPartnerId: 0,
    noMatchingLog: 0,
  };

  let cursor: string | undefined;

  while (true) {
    const applications = await prisma.programApplication.findMany({
      where: {
        enrollment: null,
        status: ProgramApplicationStatus.pending,
        reviewedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
        email: true,
        reviewedAt: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
    });

    if (applications.length === 0) {
      break;
    }

    totals.scanned += applications.length;
    cursor = applications[applications.length - 1].id;

    const partnerIdByEmail = await getPartnerIdsByEmail(
      applications
        .filter(({ partnerId }) => !partnerId)
        .map(({ email }) => email),
    );

    const candidates = applications.flatMap((application) => {
      const partnerId =
        application.partnerId ??
        partnerIdByEmail.get(application.email.toLowerCase());

      if (!partnerId || !application.reviewedAt) {
        totals.noPartnerId++;
        return [];
      }

      return [
        {
          ...application,
          partnerId,
          reviewedAt: application.reviewedAt,
        },
      ];
    });

    const logs =
      candidates.length > 0
        ? await prisma.activityLog.findMany({
            where: {
              resourceType: "partner",
              resourceId: {
                in: [...new Set(candidates.map(({ partnerId }) => partnerId))],
              },
              programId: {
                in: [...new Set(candidates.map(({ programId }) => programId))],
              },
              action: {
                in: Object.keys(REVIEW_LOG_ACTIONS),
              },
            },
            select: {
              programId: true,
              resourceId: true,
              action: true,
              createdAt: true,
            },
          })
        : [];

    const logsByKey = new Map<string, typeof logs>();

    for (const log of logs) {
      const key = `${log.programId}:${log.resourceId}`;
      logsByKey.set(key, [...(logsByKey.get(key) ?? []), log]);
    }

    const idsByStatus: Record<ProgramApplicationStatus, string[]> = {
      pending: [],
      approved: [],
      rejected: [],
    };

    const unmatched: typeof candidates = [];

    for (const candidate of candidates) {
      const status = findClosestDecision(
        logsByKey.get(`${candidate.programId}:${candidate.partnerId}`) ?? [],
        candidate.reviewedAt,
      );

      if (!status) {
        unmatched.push(candidate);
        continue;
      }

      idsByStatus[status].push(candidate.id);
    }

    totals.noMatchingLog += unmatched.length;

    if (unmatched.length > 0) {
      console.log(
        `${unmatched.length} reviewed applications have no matching activity log`,
      );
      console.table(unmatched.slice(0, 20));
    }

    for (const status of [
      ProgramApplicationStatus.approved,
      ProgramApplicationStatus.rejected,
    ]) {
      const ids = idsByStatus[status];

      if (ids.length === 0) {
        continue;
      }

      if (DRY_RUN) {
        totals[status] += ids.length;
        continue;
      }

      const { count } = await prisma.programApplication.updateMany({
        where: {
          id: {
            in: ids,
          },
          status: ProgramApplicationStatus.pending,
        },
        data: {
          status,
        },
      });

      totals[status] += count;
    }

    console.log(
      `${DRY_RUN ? "Would process" : "Processed"} ${applications.length} applications up to ${cursor}`,
    );
  }

  console.table(totals);
}

// Pass 5: reviewed applications from before ActivityLog existed take the decision from the
// Tinybird audit log written by the same review (matched by programId, partnerId, and closest to reviewedAt).
// dub_audit_logs has a 1-year TTL, so this has to run before the 2026-03-30+ logs expire.
async function backfillFromAuditLogs() {
  console.log(
    "Pass 5: reviewed applications without an enrollment, from the Tinybird audit log",
  );

  const totals = {
    scanned: 0,
    approved: 0,
    rejected: 0,
    noPartnerId: 0,
    noMatchingAuditLog: 0,
  };

  let cursor: string | undefined;

  while (true) {
    const applications = await prisma.programApplication.findMany({
      where: {
        enrollment: null,
        status: ProgramApplicationStatus.pending,
        reviewedAt: {
          not: null,
          lt: ACTIVITY_LOGS_INTRODUCED_AT,
        },
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
        email: true,
        reviewedAt: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
    });

    if (applications.length === 0) {
      break;
    }

    totals.scanned += applications.length;
    cursor = applications[applications.length - 1].id;

    const partnerIdByEmail = await getPartnerIdsByEmail(
      applications
        .filter(({ partnerId }) => !partnerId)
        .map(({ email }) => email),
    );

    const candidates = applications.flatMap((application) => {
      const partnerId =
        application.partnerId ??
        partnerIdByEmail.get(application.email.toLowerCase());

      if (!partnerId || !application.reviewedAt) {
        totals.noPartnerId++;
        return [];
      }

      return [
        {
          ...application,
          partnerId,
          reviewedAt: application.reviewedAt,
        },
      ];
    });

    const candidatesByProgramId = new Map<string, typeof candidates>();

    for (const candidate of candidates) {
      candidatesByProgramId.set(candidate.programId, [
        ...(candidatesByProgramId.get(candidate.programId) ?? []),
        candidate,
      ]);
    }

    const programs = await prisma.program.findMany({
      where: {
        id: {
          in: [...candidatesByProgramId.keys()],
        },
      },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    const logsByKey = new Map<string, { action: string; createdAt: Date }[]>();

    for (const program of programs) {
      const programCandidates = candidatesByProgramId.get(program.id) ?? [];

      const reviewedAtTimes = programCandidates.map(({ reviewedAt }) =>
        reviewedAt.getTime(),
      );

      // TODO:
      // We can add a custom pipe to do this
      const auditLogs = await getAuditLogs({
        workspaceId: program.workspaceId,
        programId: program.id,
        start: new Date(
          Math.min(...reviewedAtTimes) - REVIEW_LOG_MATCH_WINDOW_MS,
        ),
        end: new Date(
          Math.max(...reviewedAtTimes) + REVIEW_LOG_MATCH_WINDOW_MS,
        ),
      });

      for (const auditLog of auditLogs) {
        if (!isReviewLogAction(auditLog.action)) {
          continue;
        }

        const partnerId = getAuditLogPartnerId(auditLog.targets);

        if (!partnerId) {
          continue;
        }

        const key = `${program.id}:${partnerId}`;

        logsByKey.set(key, [
          ...(logsByKey.get(key) ?? []),
          {
            action: auditLog.action,
            createdAt: parseTinybirdTimestamp(auditLog.timestamp),
          },
        ]);
      }
    }

    const idsByStatus: Record<ProgramApplicationStatus, string[]> = {
      pending: [],
      approved: [],
      rejected: [],
    };

    const unmatched: typeof candidates = [];

    for (const candidate of candidates) {
      const status = findClosestDecision(
        logsByKey.get(`${candidate.programId}:${candidate.partnerId}`) ?? [],
        candidate.reviewedAt,
      );

      if (!status) {
        unmatched.push(candidate);
        continue;
      }

      idsByStatus[status].push(candidate.id);
    }

    totals.noMatchingAuditLog += unmatched.length;

    if (unmatched.length > 0) {
      console.log(
        `${unmatched.length} reviewed applications have no matching audit log`,
      );
      console.table(unmatched.slice(0, 20));
    }

    for (const status of [
      ProgramApplicationStatus.approved,
      ProgramApplicationStatus.rejected,
    ]) {
      const ids = idsByStatus[status];

      if (ids.length === 0) {
        continue;
      }

      if (DRY_RUN) {
        totals[status] += ids.length;
        continue;
      }

      const { count } = await prisma.programApplication.updateMany({
        where: {
          id: {
            in: ids,
          },
          status: ProgramApplicationStatus.pending,
        },
        data: {
          status,
        },
      });

      totals[status] += count;
    }

    console.log(
      `${DRY_RUN ? "Would process" : "Processed"} ${applications.length} applications up to ${cursor}`,
    );
  }

  console.table(totals);
}

async function main() {
  console.log(`DRY_RUN=${DRY_RUN} BATCH_SIZE=${BATCH_SIZE}`);

  // In order:
  await backfillFromEnrollments();
  await backfillRejectedFromRejectionFields();
  await backfillPartnerIdsByEmail();
  await backfillFromActivityLogs();
  await backfillFromAuditLogs();

  console.log("Finished.");
}

main();
