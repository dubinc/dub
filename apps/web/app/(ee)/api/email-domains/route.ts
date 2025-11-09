import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  createEmailDomainBodySchema,
  EmailDomainSchema,
} from "@/lib/zod/schemas/email-domains";
import { resend } from "@dub/email/resend";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/email-domains - get all email domains for a program
export const GET = withWorkspace(
  async ({ workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const emailDomains = await prisma.emailDomain.findMany({
      where: {
        programId,
      },
    });

    return NextResponse.json(z.array(EmailDomainSchema).parse(emailDomains));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredPermissions: ["domains.read"],
  },
);

// POST /api/email-domains - create an email domain
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { slug } = createEmailDomainBodySchema.parse(
      await parseRequestBody(req),
    );

    const existingEmailDomain = await prisma.emailDomain.findFirst({
      where: {
        programId,
      },
    });

    if (existingEmailDomain) {
      throw new DubApiError({
        code: "conflict",
        message:
          "An email domain has already been configured for this program. Each program can only have one email domain.",
      });
    }

    if (!resend) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Resend is not configured.",
      });
    }

    const { data: resendDomain, error: resendError } =
      await resend.domains.create({
        name: slug,
      });

    if (resendError) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: resendError.message,
      });
    }

    try {
      const emailDomain = await prisma.emailDomain.create({
        data: {
          id: createId({ prefix: "dom_" }),
          workspaceId: workspace.id,
          programId,
          slug,
          resendDomainId: resendDomain.id,
        },
      });

      waitUntil(
        (async () => {
          // Verify an existing domain
          const { error: resendVerifyError } = await resend.domains.verify(
            resendDomain.id,
          );

          if (resendVerifyError) {
            console.error(
              `Resend domain verify failed - ${resendVerifyError.message}`,
            );
          }

          // Enable open tracking for the domain
          const { error: resendUpdateError } = await resend.domains.update({
            id: resendDomain.id,
            openTracking: true,
            clickTracking: false,
            tls: "opportunistic",
          });

          if (resendUpdateError) {
            console.error(
              `Resend domain update failed - ${resendUpdateError.message}`,
            );
          }
        })(),
      );

      return NextResponse.json(EmailDomainSchema.parse(emailDomain), {
        status: 201,
      });
    } catch (error) {
      // Cleanup to avoid orphaned Resend domains
      waitUntil(resend.domains.remove(resendDomain.id));

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new DubApiError({
            code: "conflict",
            message: `This ${slug} domain has been registered already by another program.`,
          });
        }
      }

      throw new DubApiError({
        code: "internal_server_error",
        message: error.message,
      });
    }
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredPermissions: ["domains.write"],
  },
);
