import { DubApiError } from "@/lib/api/errors";
import { createLinkAndEnrollPartner } from "@/lib/api/partners/enroll-partner";
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
    const { programId, partnerId, tenantId, partner } =
      createEmbedTokenSchema.parse(await parseRequestBody(req));

    if (!partnerId && !tenantId && !partner) {
      throw new DubApiError({
        message: "You must provide either partnerId, tenantId, or partner.",
        code: "bad_request",
      });
    }

    let programEnrollment: Pick<ProgramEnrollment, "partnerId"> | null = null;

    if (partnerId || tenantId) {
      programEnrollment = await prisma.programEnrollment.findUnique({
        where: partnerId
          ? { partnerId_programId: { partnerId, programId } }
          : { tenantId_programId: { tenantId: tenantId!, programId } },
      });

      if (!programEnrollment) {
        throw new DubApiError({
          message: `Partner with ${
            partnerId ? `ID ${partnerId}` : `tenant ID ${tenantId}`
          } does not enroll in this program ${programId}.`,
          code: "not_found",
        });
      }
    } else if (partner) {
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

      const existingPartner = await prisma.partner.findUnique({
        where: {
          email: partner.email,
        },
        include: {
          programs: {
            where: {
              programId,
            },
          },
        },
      });

      if (existingPartner) {
        // partner exists but is not enrolled in the program
        if (existingPartner.programs.length === 0) {
          const enrolledPartner = await createLinkAndEnrollPartner({
            workspace,
            program,
            partner: {
              ...partner,
              programId,
            },
            userId: session.user.id,
          });

          programEnrollment = {
            partnerId: enrolledPartner.id,
          };
        } else {
          programEnrollment = {
            partnerId: existingPartner.id,
          };
        }
      }
    }

    const response = await embedToken.create({
      programId,
      ...(programEnrollment
        ? { partnerId: programEnrollment.partnerId }
        : partner // we'll create the parter during the initial loading of the embed page
          ? { partner: { ...partner, userId: session.user.id } }
          : null),
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
