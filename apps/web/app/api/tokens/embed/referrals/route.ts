import { DubApiError } from "@/lib/api/errors";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { createPartnerLink } from "@/lib/api/partners/create-partner-link";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { referralsEmbedToken } from "@/lib/embed/referrals/token-class";
import {
  createReferralsEmbedTokenSchema,
  ReferralsEmbedTokenSchema,
} from "@/lib/zod/schemas/token";
import { prisma } from "@dub/prisma";
import { ProgramEnrollment } from "@prisma/client";
import { NextResponse } from "next/server";

// POST /api/tokens/embed/referrals - create a new embed token for the given partner/tenant
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const {
      programId,
      partnerId,
      tenantId,
      partner: partnerProps,
    } = createReferralsEmbedTokenSchema.parse(await parseRequestBody(req));

    let programEnrollment: Pick<ProgramEnrollment, "partnerId"> | null = null;

    // find the program enrollment for the given partnerId or tenantId
    if (partnerId || tenantId) {
      programEnrollment = await prisma.programEnrollment.findUnique({
        where: partnerId
          ? { partnerId_programId: { partnerId, programId } }
          : { tenantId_programId: { tenantId: tenantId!, programId } },
        select: {
          partnerId: true,
        },
      });
    }

    // if there is no programEnrollment associated with the partnerId or tenantId, and partnerProps are provided
    // check if the partner exists based on the email – if not, create them, if yes, enroll them
    if (!programEnrollment && partnerProps) {
      const program = await prisma.program.findUnique({
        where: {
          id: programId,
        },
        select: {
          id: true,
          workspaceId: true,
          defaultFolderId: true,
          defaultRewardId: true,
          defaultDiscountId: true,
          domain: true,
          url: true,
        },
      });

      if (!program || program.workspaceId !== workspace.id) {
        throw new DubApiError({
          message: `Program with ID ${programId} not found.`,
          code: "not_found",
        });
      }

      const partner = await prisma.partner.findUnique({
        where: {
          email: partnerProps.email,
        },
        include: {
          programs: {
            where: {
              programId,
            },
          },
        },
      });

      // partner does not exist, we need to create them OR
      // partner exists but is not enrolled in the program, we need to enroll them
      if (!partner || partner.programs.length === 0) {
        const partnerLink = await createPartnerLink({
          workspace,
          program,
          partner: partnerProps,
          userId: session.user.id,
        });

        const enrolledPartner = await createAndEnrollPartner({
          program,
          link: partnerLink,
          workspace,
          partner: {
            name: partnerProps.name,
            email: partnerProps.email,
            image: partnerProps.image ?? null,
            country: partnerProps.country ?? null,
            description: partnerProps.description,
          },
          tenantId: partnerProps.tenantId,
        });

        programEnrollment = {
          partnerId: enrolledPartner.id,
        };
      } else {
        programEnrollment = {
          partnerId: partner.programs[0].partnerId,
        };
      }
    }

    if (!programEnrollment) {
      throw new DubApiError({
        message: "The partner is not enrolled in this program.",
        code: "not_found",
      });
    }

    const response = await referralsEmbedToken.create({
      programId,
      partnerId: programEnrollment.partnerId,
    });

    return NextResponse.json(ReferralsEmbedTokenSchema.parse(response), {
      status: 201,
    });
  },
  {
    requiredPermissions: ["links.write"],
    requiredPlan: ["advanced", "enterprise"],
  },
);
