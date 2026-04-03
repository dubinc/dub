import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  assignProgramInputSchema,
  assignedProgramOutputSchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// PUT /api/partner-profile/users/[userId]/programs - set assigned programs for a user
export const PUT = withPartnerProfile(
  async ({ partner, params, req }) => {
    const { userId } = params;
    const { programIds } = assignProgramInputSchema.parse(
      await parseRequestBody(req),
    );

    const targetUser = await prisma.partnerUser.findUnique({
      where: {
        userId_partnerId: {
          userId,
          partnerId: partner.id,
        },
      },
    });

    if (!targetUser) {
      throw new DubApiError({
        code: "not_found",
        message: "User not found.",
      });
    }

    if (targetUser.role === "owner") {
      throw new DubApiError({
        code: "bad_request",
        message: "Cannot scope an owner to specific programs or links.",
      });
    }

    // Validate all programIds are programs the partner is enrolled in
    if (programIds.length > 0) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          partnerId: partner.id,
          programId: {
            in: programIds,
          },
        },
        select: {
          programId: true,
        },
      });

      const enrolledProgramIds = new Set(
        programEnrollments.map((e) => e.programId),
      );

      const invalidIds = programIds.filter((id) => !enrolledProgramIds.has(id));

      if (invalidIds.length > 0) {
        throw new DubApiError({
          code: "bad_request",
          message: `Invalid program IDs: ${invalidIds.join(", ")}`,
        });
      }
    }

    // Replace all program assignments in a transaction
    // Also remove link assignments for programs that are being removed
    const result = await prisma.$transaction(async (tx) => {
      // Get current program assignments to find removed programs
      const currentAssignments = await tx.partnerUserProgram.findMany({
        where: {
          partnerUserId: targetUser.id,
        },
        select: {
          programId: true,
        },
      });

      const newProgramIdSet = new Set(programIds);
      const removedProgramIds = currentAssignments
        .map((a) => a.programId)
        .filter((id) => !newProgramIdSet.has(id));

      // Delete all current program assignments
      await tx.partnerUserProgram.deleteMany({
        where: {
          partnerUserId: targetUser.id,
        },
      });

      // Remove link assignments for removed programs
      if (removedProgramIds.length > 0) {
        await tx.partnerUserLink.deleteMany({
          where: {
            partnerUserId: targetUser.id,
            programId: {
              in: removedProgramIds,
            },
          },
        });
      }

      // Create new program assignments
      if (programIds.length > 0) {
        await tx.partnerUserProgram.createMany({
          data: programIds.map((programId) => ({
            partnerUserId: targetUser.id,
            programId,
          })),
          skipDuplicates: true,
        });
      }

      // Return the updated assignments
      return tx.partnerUserProgram.findMany({
        where: {
          partnerUserId: targetUser.id,
        },
        include: {
          program: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      z.array(assignedProgramOutputSchema).parse(
        result.map((ap) => ({
          program: ap.program,
          createdAt: ap.createdAt,
        })),
      ),
    );
  },
  {
    requiredPermission: "users.update",
  },
);
