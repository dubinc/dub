import { prisma } from "@/lib/prisma";
import {
  ProgramApplicationStatus,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 100;
const CREATED_BEFORE = new Date("2026-10-01T00:00:00.000Z");

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

type Mismatch = {
  enrollmentId: string;
  applicationId: string;
  createdAt: string;
  mismatches: string;
  enrollmentStatus: string;
  applicationStatus: string;
  expectedStatus: string;
  enrollmentPartnerId: string;
  applicationPartnerId: string | null;
  enrollmentProgramId: string;
  applicationProgramId: string;
};

async function main() {
  console.log(
    `Read-only. Comparing ProgramEnrollments created before ${CREATED_BEFORE.toISOString()} that have an application row.`,
  );
  console.log(
    "Status matches when pending and rejected stay as-is, and every other enrollment status expects application status approved.",
  );

  const totals = {
    scanned: 0,
    statusMismatch: 0,
    partnerIdMismatch: 0,
    programIdMismatch: 0,
    enrollmentsWithMismatch: 0,
  };

  const mismatches: Mismatch[] = [];
  let cursor: string | undefined;

  while (true) {
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        applicationId: {
          not: null,
        },
        application: {
          isNot: null,
        },
        createdAt: {
          lt: CREATED_BEFORE,
        },
        ...(cursor && {
          id: {
            gt: cursor,
          },
        }),
      },
      select: {
        id: true,
        applicationId: true,
        partnerId: true,
        programId: true,
        status: true,
        createdAt: true,
        application: {
          select: {
            id: true,
            partnerId: true,
            programId: true,
            status: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (enrollments.length === 0) {
      break;
    }

    totals.scanned += enrollments.length;
    cursor = enrollments[enrollments.length - 1].id;

    for (const enrollment of enrollments) {
      const applicationId = enrollment.applicationId;

      if (!applicationId) {
        continue;
      }

      const application = enrollment.application;

      if (!application) {
        continue;
      }

      const expectedStatus = getApplicationStatusFromEnrollment(
        enrollment.status,
      );
      const fields: string[] = [];

      if (application.status !== expectedStatus) {
        totals.statusMismatch++;
        fields.push("status");
      }

      if (
        application.partnerId &&
        application.partnerId !== enrollment.partnerId
      ) {
        totals.partnerIdMismatch++;
        fields.push("partnerId");
      }

      if (
        application.programId &&
        application.programId !== enrollment.programId
      ) {
        totals.programIdMismatch++;
        fields.push("programId");
      }

      if (fields.length === 0) {
        continue;
      }

      totals.enrollmentsWithMismatch++;
      mismatches.push({
        enrollmentId: enrollment.id,
        applicationId,
        createdAt: enrollment.createdAt.toISOString(),
        mismatches: fields.join(", "),
        enrollmentStatus: enrollment.status,
        applicationStatus: application.status,
        expectedStatus,
        enrollmentPartnerId: enrollment.partnerId,
        applicationPartnerId: application.partnerId,
        enrollmentProgramId: enrollment.programId,
        applicationProgramId: application.programId,
      });
    }

    console.log(`Scanned ${totals.scanned} enrollments through ${cursor}`);
  }

  console.table(totals);

  if (mismatches.length > 0) {
    console.table(mismatches);
  }

  if (totals.enrollmentsWithMismatch === 0) {
    console.log(
      "Every enrollment created before 2026-10-01 with an application row matches on status, partnerId, and programId.",
    );
    return;
  }

  console.log(
    `${totals.enrollmentsWithMismatch} enrollments do not match their application.`,
  );
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
