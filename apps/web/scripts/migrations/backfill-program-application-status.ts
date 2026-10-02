import { prisma } from "@/lib/prisma";
import {
  ProgramApplicationStatus,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import "dotenv-flow/config";

const DRY_RUN = true;
const BATCH_SIZE = 100;

// Max gap between an application's reviewedAt and the activity log written by the same review
const REVIEW_LOG_MATCH_WINDOW_MS = 10 * 60 * 1000;

const REVIEW_LOG_ACTIONS = {
  "partner_application.approved": ProgramApplicationStatus.approved,
  "partner_application.rejected": ProgramApplicationStatus.rejected,
} as const;

type ReviewLogAction = keyof typeof REVIEW_LOG_ACTIONS;

function isReviewLogAction(action: string): action is ReviewLogAction {
  return action in REVIEW_LOG_ACTIONS;
}

function getApplicationStatusFromEnrollment(
  enrollmentStatus: ProgramEnrollmentStatus,
): ProgramApplicationStatus {
  if (enrollmentStatus === ProgramEnrollmentStatus.pending) {
    return ProgramApplicationStatus.pending;
  }

  if (enrollmentStatus === ProgramEnrollmentStatus.rejected) {
    return ProgramApplicationStatus.rejected;
  }

  return ProgramApplicationStatus.approved;
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
        await Promise.all(
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
        ...(cursor && {
          id: {
            gt: cursor,
          },
        }),
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
        ...(cursor && {
          id: {
            gt: cursor,
          },
        }),
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
        await Promise.all(
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
        ...(cursor && {
          id: {
            gt: cursor,
          },
        }),
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

// Pass 5: reviewed applications still pending without an enrollment were rejected, or their partner was removed from the program
async function backfillRejectedWithoutEnrollment() {
  console.log(
    "Pass 5: reviewed applications without an enrollment and no matching activity log",
  );

  const totals = {
    scanned: 0,
    rejected: 0,
  };

  let cursor: string | undefined;

  while (true) {
    const applications = await prisma.programApplication.findMany({
      where: {
        ...(cursor && {
          id: {
            gt: cursor,
          },
        }),
        enrollment: null,
        status: ProgramApplicationStatus.pending,
        reviewedAt: {
          not: null,
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (applications.length === 0) {
      break;
    }

    totals.scanned += applications.length;
    cursor = applications[applications.length - 1].id;

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

async function unsetPartnerIdForUnclaimedApplications() {
  console.log("Unsetting partnerId for unclaimed applications");

  const totals = {
    scanned: 0,
    unclaimed: 0,
  };

  let cursor: string | undefined;

  while (true) {
    const applications = await prisma.programApplication.findMany({
      where: {
        status: ProgramApplicationStatus.pending,
        enrollment: null,
        partnerId: {
          not: null,
        },
        ...(cursor && {
          id: {
            gt: cursor,
          },
        }),
      },
      select: {
        id: true,
        partnerId: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (applications.length === 0) {
      break;
    }

    totals.scanned += applications.length;
    cursor = applications[applications.length - 1].id;

    const unclaimedApplications = applications.filter(
      ({ partnerId }) => !partnerId,
    );

    if (unclaimedApplications.length > 0) {
      console.table(unclaimedApplications.slice(0, 20));
    }

    if (DRY_RUN) {
      totals.unclaimed += unclaimedApplications.length;
    } else {
      const { count } = await prisma.programApplication.updateMany({
        where: {
          id: {
            in: unclaimedApplications.map(({ id }) => id),
          },
        },
        data: {
          partnerId: null,
        },
      });

      totals.unclaimed += count;
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
  // await backfillFromEnrollments();
  // await backfillRejectedFromRejectionFields();
  // await backfillPartnerIdsByEmail();
  // await backfillFromActivityLogs();
  // await backfillRejectedWithoutEnrollment();
  // await unsetPartnerIdForUnclaimedApplications();
  console.log("Finished.");
}

main();
