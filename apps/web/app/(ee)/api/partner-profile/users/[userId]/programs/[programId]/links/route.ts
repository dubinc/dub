import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  assignLinkInputSchema,
  assignedLinkOutputSchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// PUT /api/partner-profile/users/[userId]/programs/[programId]/links - set assigned links for a user in a program
export const PUT = withPartnerProfile(
  async ({ partner, params, req }) => {
    const { userId, programId } = params;
    const { linkIds } = assignLinkInputSchema.parse(
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

    // Validate the program is one the partner is enrolled in
    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
        },
      },
    });

    if (!programEnrollment) {
      throw new DubApiError({
        code: "bad_request",
        message: "Partner is not enrolled in this program.",
      });
    }

    // Validate all linkIds belong to this partner+program
    if (linkIds.length > 0) {
      const links = await prisma.link.findMany({
        where: {
          id: {
            in: linkIds,
          },
          programId,
          partnerId: partner.id,
        },
        select: {
          id: true,
        },
      });

      const validLinkIds = new Set(links.map((l) => l.id));
      const invalidIds = linkIds.filter((id) => !validLinkIds.has(id));

      if (invalidIds.length > 0) {
        throw new DubApiError({
          code: "bad_request",
          message: `Invalid link IDs: ${invalidIds.join(", ")}`,
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Ensure PartnerUserProgram exists (assigning links implies program access)
      await tx.partnerUserProgram.upsert({
        where: {
          partnerUserId_programId: {
            partnerUserId: targetUser.id,
            programId,
          },
        },
        create: {
          partnerUserId: targetUser.id,
          programId,
        },
        update: {},
      });

      // Delete all current link assignments for this user+program
      await tx.partnerUserLink.deleteMany({
        where: {
          partnerUserId: targetUser.id,
          programId,
        },
      });

      // Create new link assignments
      if (linkIds.length > 0) {
        await tx.partnerUserLink.createMany({
          data: linkIds.map((linkId) => ({
            partnerUserId: targetUser.id,
            linkId,
            programId,
          })),
          skipDuplicates: true,
        });
      }

      // Return the updated assignments
      return tx.partnerUserLink.findMany({
        where: {
          partnerUserId: targetUser.id,
          programId,
        },
        include: {
          link: {
            select: {
              id: true,
              domain: true,
              key: true,
              shortLink: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      z.array(assignedLinkOutputSchema).parse(
        result.map((al) => ({
          link: al.link,
          createdAt: al.createdAt,
        })),
      ),
    );
  },
  {
    requiredPermission: "users.update",
  },
);
