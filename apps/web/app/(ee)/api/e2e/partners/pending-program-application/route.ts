import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { assertE2EWorkspace } from "../../guard";

const bodySchema = z.object({
  partnerId: z.string(),
  groupId: z.string().optional(),
});

// POST /api/e2e/partners/pending-program-application
// Ensures the partner has a pending program enrollment with a ProgramApplication row
// (for E2E tests of approve/reject). Supports resetting a rejected enrollment back to pending.
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    assertE2EWorkspace(workspace);

    const { partnerId, groupId: groupIdFromBody } = bodySchema.parse(
      await parseRequestBody(req),
    );

    const programId = getDefaultProgramIdOrThrow(workspace);

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
      },
    });

    if (!partner) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });
    }

    const enrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      include: {
        application: true,
      },
    });

    if (!enrollment) {
      throw new DubApiError({
        code: "not_found",
        message: "Program enrollment not found for this partner.",
      });
    }

    const groupId =
      groupIdFromBody ?? enrollment.groupId ?? enrollment.application?.groupId;

    if (!groupId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "No groupId on enrollment; pass groupId in the request body for this E2E helper.",
      });
    }

    if (enrollment.status === ProgramEnrollmentStatus.pending) {
      if (enrollment.applicationId && enrollment.application) {
        return NextResponse.json({
          partnerId,
          programApplicationId: enrollment.applicationId,
          reset: false,
        });
      }

      const applicationId = createId({ prefix: "pga_" });

      await prisma.$transaction([
        prisma.programApplication.create({
          data: {
            id: applicationId,
            programId,
            groupId,
            name: partner.name,
            email:
              partner.email ?? `${partner.id}@e2e.dub-internal-test.com`,
            country: partner.country ?? "US",
            formData: { fields: [] },
          },
        }),
        prisma.programEnrollment.update({
          where: { id: enrollment.id },
          data: { applicationId },
        }),
      ]);

      return NextResponse.json({
        partnerId,
        programApplicationId: applicationId,
        reset: true,
      });
    }

    if (enrollment.status === ProgramEnrollmentStatus.rejected) {
      if (!enrollment.applicationId) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Rejected enrollment has no application record; recreate the partner for E2E.",
        });
      }

      await prisma.$transaction([
        prisma.programApplication.update({
          where: { id: enrollment.applicationId },
          data: {
            reviewedAt: null,
            rejectionReason: null,
            rejectionNote: null,
            userId: null,
          },
        }),
        prisma.programEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: ProgramEnrollmentStatus.pending,
          },
        }),
      ]);

      return NextResponse.json({
        partnerId,
        programApplicationId: enrollment.applicationId,
        reset: true,
      });
    }

    if (enrollment.status === ProgramEnrollmentStatus.approved) {
      const applicationId = createId({ prefix: "pga_" });

      await prisma.$transaction([
        prisma.programApplication.create({
          data: {
            id: applicationId,
            programId,
            groupId,
            name: partner.name,
            email:
              partner.email ?? `${partner.id}@e2e.dub-internal-test.com`,
            country: partner.country ?? "US",
            formData: { fields: [] },
          },
        }),
        prisma.programEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: ProgramEnrollmentStatus.pending,
            applicationId,
          },
        }),
      ]);

      return NextResponse.json({
        partnerId,
        programApplicationId: applicationId,
        reset: true,
      });
    }

    throw new DubApiError({
      code: "bad_request",
      message: `Cannot seed a pending application from enrollment status "${enrollment.status}".`,
    });
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
