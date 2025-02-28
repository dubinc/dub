import { DubApiError } from "@/lib/api/errors";
import { createLinkAndEnrollPartner } from "@/lib/api/partners/enroll-partner";
import { createId, parseRequestBody } from "@/lib/api/utils";
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

    if (!partnerId && !tenantId && !partnerProps) {
      throw new DubApiError({
        message: "You must provide either partnerId, tenantId, or partner.",
        code: "bad_request",
      });
    }

    let programEnrollment: Pick<ProgramEnrollment, "partnerId"> | null = null;

    // if partnerId is provided, use it to find the program enrollment
    if (partnerId) {
      programEnrollment = await prisma.programEnrollment.findUnique({
        where: { partnerId_programId: { partnerId, programId } },
      });

      if (!programEnrollment) {
        throw new DubApiError({
          message: `Partner with ID ${partnerId} is not enrolled in this program (${programId}).`,
          code: "not_found",
        });
      }
      // if tenantId is provided, use it to find the program enrollment
    } else if (tenantId) {
      programEnrollment = await prisma.programEnrollment.findUnique({
        where: { tenantId_programId: { tenantId, programId } },
      });

      // if there's no programEnrollment (partner doesn't exist / partner is not enrolled in program)
      if (!programEnrollment) {
        if (!partnerProps) {
          throw new DubApiError({
            message: `Partner with tenant ID ${tenantId} is not enrolled in this program (${programId}). Pass a "partner" object to enroll the partner on-demand.`,
            code: "not_found",
          });
        }
        const program = await prisma.program.findUnique({
          where: {
            id: programId,
          },
        });

        if (!program || program.workspaceId !== workspace.id) {
          throw new DubApiError({
            message: `Program with ID ${programId} not found.`,
            code: "not_found",
          });
        }

        const upsertedPartner = await prisma.partner.upsert({
          where: {
            email: partnerProps.email,
          },
          create: {
            id: createId("pn_"),
            email: partnerProps.email,
            name: partnerProps.name,
            image: partnerProps.image,
          },
          update: {},
          include: {
            programs: {
              where: {
                programId,
              },
            },
          },
        });

        programEnrollment = {
          partnerId: upsertedPartner.id,
        };

        // partner exists but is not enrolled in the program, we need to enroll them
        if (upsertedPartner.programs.length === 0) {
          await createLinkAndEnrollPartner({
            workspace,
            program,
            partner: {
              ...partnerProps,
              programId,
              tenantId, // also set tenantId for easy future retrieval
            },
            userId: session.user.id,
          });
        } else {
          // update the partner's program enrollment to use the passed tenantId
          await prisma.programEnrollment.update({
            where: {
              partnerId_programId: {
                partnerId: upsertedPartner.id,
                programId,
              },
            },
            data: {
              tenantId,
            },
          });
        }
      }
    } else {
      throw new DubApiError({
        message: "You must provide either partnerId, tenantId, or partner.",
        code: "bad_request",
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
