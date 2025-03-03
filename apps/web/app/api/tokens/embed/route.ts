import { DubApiError } from "@/lib/api/errors";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { createPartnerLink } from "@/lib/api/partners/create-partner-link";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { embedToken } from "@/lib/embed/embed-token";
import {
  createEmbedTokenSchema,
  EmbedTokenSchema,
} from "@/lib/zod/schemas/token";
import { prisma } from "@dub/prisma";
import { ProgramEnrollment } from "@prisma/client";
import { NextResponse } from "next/server";

// POST /api/tokens/embed - create a new embed token for the given partner/tenant
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const {
      programId,
      partnerId,
      tenantId,
      partner: partnerProps,
    } = createEmbedTokenSchema.parse(await parseRequestBody(req));

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

    // check if the partner exists based on the email and create or enroll them
    else if (partnerProps) {
      const program = await prisma.program.findUnique({
        where: {
          id: programId,
        },
        select: {
          id: true,
          workspaceId: true,
          defaultFolderId: true,
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
        message: `Partner with ${partnerId ? "ID" : "tenantId"} ${
          partnerId ?? tenantId
        } is not enrolled in this program (${programId}).`,
        code: "not_found",
      });
    }

    const response = await embedToken.create({
      programId,
      partnerId: programEnrollment.partnerId,
    });

    return NextResponse.json(EmbedTokenSchema.parse(response), {
      status: 201,
    });
  },
  {
    requiredPermissions: ["links.write"],
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "enterprise",
    ],
  },
);
