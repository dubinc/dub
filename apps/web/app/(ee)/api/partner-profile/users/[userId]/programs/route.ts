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

// PUT /api/partner-profile/users/[userId]/programs
export const PUT = withPartnerProfile(
  async ({ partner, params, req }) => {
    const { userId } = params;
    const { programAccess, programIds, linkIds } =
      assignProgramInputSchema.parse(await parseRequestBody(req));

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

    const effectiveProgramIds = programAccess === "all" ? [] : programIds;

    // Validate all programIds are programs the partner is enrolled in
    if (effectiveProgramIds.length > 0) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          partnerId: partner.id,
          programId: {
            in: effectiveProgramIds,
          },
        },
        select: {
          programId: true,
        },
      });

      const enrolledProgramIds = new Set(
        programEnrollments.map(({ programId }) => programId),
      );

      const invalidIds = effectiveProgramIds.filter(
        (id) => !enrolledProgramIds.has(id),
      );

      if (invalidIds.length > 0) {
        throw new DubApiError({
          code: "bad_request",
          message: `Invalid program IDs: ${invalidIds.join(", ")}`,
        });
      }
    }

    // Batch-validate all link IDs — each must exist and belong to the specific program it's listed under
    const allRequestedLinkIds = Object.entries(linkIds).flatMap(
      ([, ids]) => ids ?? [],
    );

    if (allRequestedLinkIds.length > 0) {
      const validLinks = await prisma.link.findMany({
        where: {
          id: {
            in: allRequestedLinkIds,
          },
          programId: {
            in: effectiveProgramIds,
          },
        },
        select: {
          id: true,
          programId: true,
        },
      });

      const linkProgramMap = new Map(
        validLinks.map((l) => [l.id, l.programId]),
      );

      const invalidIds: string[] = [];

      for (const [programId, programLinkIds] of Object.entries(linkIds)) {
        if (!programLinkIds) continue;

        for (const linkId of programLinkIds) {
          const actualProgramId = linkProgramMap.get(linkId);

          if (actualProgramId !== programId) {
            invalidIds.push(linkId);
          }
        }
      }

      if (invalidIds.length > 0) {
        throw new DubApiError({
          code: "bad_request",
          message: `Invalid link IDs: ${invalidIds.join(", ")}`,
        });
      }
    }

    // Pre-compute link assignment rows (undefined = all links = no restriction rows)
    const newLinkAssignments = effectiveProgramIds.flatMap((programId) => {
      const programLinkIds = linkIds[programId];
      if (programLinkIds === undefined) return [];
      return programLinkIds.map((linkId) => ({
        partnerUserId: targetUser.id,
        linkId,
        programId,
      }));
    });

    // Transaction: delete old, create new
    await prisma.$transaction(async (tx) => {
      await tx.partnerUser.update({
        where: {
          id: targetUser.id,
        },
        data: {
          programAccess,
        },
      });

      // Replace program assignments
      await tx.partnerUserProgram.deleteMany({
        where: {
          partnerUserId: targetUser.id,
        },
      });

      if (effectiveProgramIds.length > 0) {
        await tx.partnerUserProgram.createMany({
          data: effectiveProgramIds.map((programId) => ({
            partnerUserId: targetUser.id,
            programId,
          })),
        });
      }

      // Replace link assignments
      await tx.partnerUserLink.deleteMany({
        where: {
          partnerUserId: targetUser.id,
        },
      });

      if (newLinkAssignments.length > 0) {
        await tx.partnerUserLink.createMany({
          data: newLinkAssignments,
        });
      }
    });

    const result = await prisma.partnerUserProgram.findMany({
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
