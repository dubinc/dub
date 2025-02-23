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
import { ProgramEnrollment } from "@prisma/client";
import { NextResponse } from "next/server";

// POST /api/tokens/embed - create a new embed token for the given partner/tenant
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const data = createEmbedTokenSchema.parse(await parseRequestBody(req));

    const { programId } = data;

    // if (!("partnerId" in data) && !("tenantId" in data)) {
    //   throw new DubApiError({
    //     message: "Partner ID or tenant ID is required.",
    //     code: "bad_request",
    //   });
    // }

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
    }

    if (!programEnrollment) {
      const program = await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
      });

      if (program.workspaceId !== workspace.id) {
        throw new DubApiError({
          message: `Program with ID ${programId} does not belong to this workspace.`,
          code: "bad_request",
        });
      }
    }

    if ("partner" in data) {
      const existingPartner = await prisma.partner.findUnique({
        where: {
          email: data.partner.email,
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

          // TODO:
          // Handle case when the shortlink key is already taken

          if (error != null) {
            throw new DubApiError({
              code: code as ErrorCodes,
              message: error,
            });
          }

          const partnerLink = await createLink(link);

          await enrollPartner({
            program,
            tenantId,
            workspace,
            link: partnerLink,
            partner: data.partner,
          });
        }
      }
    }

    // if (
    //   !programEnrollment ||
    //   programEnrollment.program.workspaceId !== workspace.id
    // ) {
    //   throw new DubApiError({
    //     message: `Partner with ${
    //       partnerId ? `ID ${partnerId}` : `tenant ID ${tenantId}`
    //     } not enrolled in this workspace's program ${programId}.`,
    //     code: "not_found",
    //   });
    // }

    const response = await embedToken.create({
      programId,
      ...(programEnrollment && { partnerId: programEnrollment.partnerId }),
      ...("partner" in data && {
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
