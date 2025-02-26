import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { enrollPartner } from "@/lib/api/partners/enroll-partner";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { embedToken } from "@/lib/embed/embed-token";
import {
  createEmbedTokenSchema,
  EmbedTokenSchema,
} from "@/lib/zod/schemas/token";
import { prisma } from "@dub/prisma";
import { Partner, ProgramEnrollment } from "@prisma/client";
import { NextResponse } from "next/server";

// POST /api/tokens/embed - create a new embed token for the given partner/tenant
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const data = createEmbedTokenSchema.parse(await parseRequestBody(req));

    const { programId } = data;

    if (
      !("partnerId" in data) &&
      !("tenantId" in data) &&
      !("partner" in data)
    ) {
      throw new DubApiError({
        message: "Partner ID or tenant ID or partner is required.",
        code: "bad_request",
      });
    }

    let programEnrollment: ProgramEnrollment | null = null;

    if ("partnerId" in data || "tenantId" in data) {
      programEnrollment = await prisma.programEnrollment.findUnique({
        where:
          "tenantId" in data
            ? { tenantId_programId: { tenantId: data.tenantId, programId } }
            : { partnerId_programId: { partnerId: data.partnerId, programId } },
        include: {
          program: true,
        },
      });

      if (!programEnrollment) {
        throw new DubApiError({
          message: `Partner with ${
            "partnerId" in data
              ? `ID ${data.partnerId}`
              : `tenant ID ${data.tenantId}`
          } does not enroll in this program ${programId}.`,
          code: "not_found",
        });
      }
    }

    let existingPartner: Partner | null = null;

    if ("partner" in data) {
      existingPartner = await prisma.partner.findUnique({
        where: {
          email: data.partner.email,
        },
      });

      // partner exists
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

          if (!program.domain || !program.url) {
            throw new DubApiError({
              message: "Program must have a domain and url.",
              code: "bad_request",
            });
          }

          const { linkProps, username, tenantId } = data.partner;

          const { link, error, code } = await processLink({
            workspace,
            userId: session.user.id,
            payload: {
              ...linkProps,
              domain: program.domain,
              key: username,
              url: program.url,
              programId,
              tenantId,
              folderId: program.defaultFolderId,
              trackConversion: true,
            },
          });

          if (error != null) {
            throw new DubApiError({
              code: code as ErrorCodes,
              message: error,
            });
          }

          const partnerLink = await createLink(link);

          // TODO: Send webhook

          const enrolledPartner = await enrollPartner({
            program,
            tenantId,
            workspace,
            link: partnerLink,
            partner: data.partner,
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
      ...(programEnrollment && { partnerId: programEnrollment.partnerId }),
      ...(!existingPartner &&
        "partner" in data && {
          partner: data.partner,
        }),
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
