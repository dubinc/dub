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

    let programEnrollment: ProgramEnrollment | null = null;

    if (partnerId) {
      programEnrollment = await prisma.programEnrollment.findUnique({
        where: {
          partnerId_programId: { partnerId, programId },
        },
        include: {
          program: true,
        },
      });
    }

    if (tenantId) {
      programEnrollment = await prisma.programEnrollment.findUnique({
        where: {
          tenantId_programId: {
            tenantId,
            programId,
          },
        },
        include: {
          program: true,
        },
      });
    }

    if (!programEnrollment) {
      throw new DubApiError({
        message: `Partner with ${
          partnerId ? `ID ${partnerId}` : `tenant ID ${tenantId}`
        } does not enroll in this program ${programId}.`,
        code: "not_found",
      });
    }

    if (partner) {
      const existingPartner = await prisma.partner.findUnique({
        where: {
          email: partner.email,
        },
      });

      if (existingPartner) {
        programEnrollment = await prisma.programEnrollment.findUnique({
          where: {
            partnerId_programId: {
              partnerId: existingPartner.id,
              programId,
            },
          },
        });

        // partner exists but is not enrolled in the program
        if (!programEnrollment) {
          const program = await prisma.program.findUniqueOrThrow({
            where: {
              id: programId,
            },
          });

          const enrolledPartner = await createLinkAndEnrollPartner({
            workspace,
            program,
            partner: {
              ...partner,
              programId,
            },
            userId: session.user.id,
          });

          programEnrollment = await prisma.programEnrollment.findUnique({
            where: {
              partnerId_programId: {
                partnerId: enrolledPartner.id,
                programId,
              },
            },
          });
        }
      }
    }

    const response = await embedToken.create({
      programId,
      ...(programEnrollment
        ? { partnerId: programEnrollment.partnerId }
        : partner
          ? { partner }
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
