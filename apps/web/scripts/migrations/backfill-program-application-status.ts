import { getApplicationStatusFromEnrollment } from "@/lib/partners/get-application-status-from-enrollment";
import { prisma } from "@/lib/prisma";
import {
  ProgramApplication,
  ProgramApplicationStatus,
  ProgramEnrollment,
} from "@prisma/client";
import "dotenv-flow/config";

const DRY_RUN = true;
const BATCH_SIZE = 500;

// ProgramApplication.reviewedAt was introduced on this date (#3664) without a backfill
const REVIEWED_AT_INTRODUCED_AT = new Date("2026-03-30");

function getApplicationStatus({
  application,
  enrollment,
  matchedPartnerId,
}: {
  application: Pick<ProgramApplication, "reviewedAt">;
  enrollment: Pick<ProgramEnrollment, "status"> | null;
  matchedPartnerId: string | null;
}): ProgramApplicationStatus {
  if (!enrollment) {
    if (application.reviewedAt) {
      return ProgramApplicationStatus.rejected;
    }

    // A partner signed up with this email, so the application was converted into an
    // enrollment that has since been removed (e.g. by the rejected-applications cleanup cron)
    return matchedPartnerId
      ? ProgramApplicationStatus.rejected
      : ProgramApplicationStatus.pending;
  }

  return getApplicationStatusFromEnrollment(enrollment.status);
}

async function main() {
  console.log(`DRY_RUN=${DRY_RUN} BATCH_SIZE=${BATCH_SIZE}`);

  const totals: Record<
    | ProgramApplicationStatus
    | "partnerIds"
    | "inferredRejected"
    | "inferredRejectedSinceReviewedAt",
    number
  > = {
    pending: 0,
    approved: 0,
    rejected: 0,
    partnerIds: 0,
    inferredRejected: 0,
    inferredRejectedSinceReviewedAt: 0,
  };

  let totalScanned = 0;
  let cursor: string | undefined;

  while (true) {
    const applications = await prisma.programApplication.findMany({
      select: {
        id: true,
        email: true,
        partnerId: true,
        status: true,
        reviewedAt: true,
        createdAt: true,
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

    totalScanned += applications.length;
    cursor = applications[applications.length - 1].id;

    const unreviewedEmails = [
      ...new Set(
        applications
          .filter(({ enrollment, reviewedAt }) => !enrollment && !reviewedAt)
          .map(({ email }) => email.toLowerCase()),
      ),
    ];

    const users =
      unreviewedEmails.length > 0
        ? await prisma.user.findMany({
            where: {
              email: {
                in: unreviewedEmails,
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
          })
        : [];

    const partnerIdByEmail = new Map(
      users
        .filter((user) => user.email && user.partners.length > 0)
        .map((user) => [user.email!.toLowerCase(), user.partners[0].partnerId]),
    );

    const changes = applications.map((application) => {
      const matchedPartnerId = application.enrollment
        ? null
        : partnerIdByEmail.get(application.email.toLowerCase()) ?? null;

      const status = getApplicationStatus({
        application,
        enrollment: application.enrollment,
        matchedPartnerId,
      });

      const partnerId =
        application.enrollment?.partnerId ?? matchedPartnerId ?? null;

      const updateStatus =
        application.status === ProgramApplicationStatus.pending &&
        status !== ProgramApplicationStatus.pending;

      return {
        id: application.id,
        enrollmentStatus: application.enrollment?.status ?? null,
        reviewedAt: application.reviewedAt,
        createdAt: application.createdAt,
        currentStatus: application.status,
        status,
        updateStatus,
        inferredRejected: Boolean(
          updateStatus && !application.reviewedAt && matchedPartnerId,
        ),
        currentPartnerId: application.partnerId,
        partnerId,
        updatePartnerId: Boolean(
          partnerId && application.partnerId !== partnerId,
        ),
      };
    });

    console.table(changes.slice(0, 20));

    const idsByStatus: Record<ProgramApplicationStatus, string[]> = {
      pending: [],
      approved: [],
      rejected: [],
    };

    for (const change of changes) {
      if (change.updateStatus) {
        idsByStatus[change.status].push(change.id);
      }
    }

    const partnerIdUpdates = changes.filter((change) => change.updatePartnerId);

    const inferredRejected = changes.filter(
      (change) => change.inferredRejected,
    );

    if (inferredRejected.length > 0) {
      console.log(
        `Inferred ${inferredRejected.length} rejected applications from matching partner emails`,
      );
      console.table(inferredRejected.slice(0, 20));
    }

    totals.inferredRejected += inferredRejected.length;
    totals.inferredRejectedSinceReviewedAt += inferredRejected.filter(
      (change) => change.createdAt >= REVIEWED_AT_INTRODUCED_AT,
    ).length;

    if (DRY_RUN) {
      for (const status of Object.values(ProgramApplicationStatus)) {
        totals[status] += idsByStatus[status].length;
      }

      totals.partnerIds += partnerIdUpdates.length;
    } else {
      for (const status of Object.values(ProgramApplicationStatus)) {
        const ids = idsByStatus[status];

        if (ids.length === 0) {
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
        await prisma.$transaction(
          partnerIdUpdates.map((change) =>
            prisma.programApplication.update({
              where: {
                id: change.id,
              },
              data: {
                partnerId: change.partnerId,
              },
            }),
          ),
        );

        totals.partnerIds += partnerIdUpdates.length;
      }
    }

    console.log(
      `${DRY_RUN ? "Would process" : "Processed"} ${applications.length} applications up to ${cursor} (scanned=${totalScanned})`,
    );
  }

  console.log(
    `Finished. scanned=${totalScanned} ${DRY_RUN ? "would-update" : "updated"}:`,
  );
  console.table(totals);
}

main();
