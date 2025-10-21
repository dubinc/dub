import { getEmailDomainOrThrow } from "@/lib/api/domains/get-email-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { updateEmailDomainBodySchema } from "@/lib/zod/schemas/email-domains";
import { resend } from "@dub/email/resend";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// PATCH /api/email-domains/[domain] - update an email domain
export const PATCH = withWorkspace(
  async ({ workspace, params, req }) => {
    const { domain } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { slug, fromAddress } = updateEmailDomainBodySchema.parse(
      await parseRequestBody(req),
    );

    const emailDomain = await getEmailDomainOrThrow({
      programId,
      domain,
    });

    // TODO:
    // Finish the update email domain logic

    return NextResponse.json({});
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

// DELETE /api/email-domains/[domain] - delete an email domain
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const { domain } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const emailDomain = await getEmailDomainOrThrow({
      programId,
      domain,
    });

    await prisma.emailDomain.delete({
      where: {
        id: emailDomain.id,
      },
    });

    if (emailDomain.resendDomainId) {
      if (!resend) {
        throw new DubApiError({
          code: "internal_server_error",
          message: "Resend is not configured.",
        });
      }

      await resend.domains.remove(emailDomain.resendDomainId);
    }

    return NextResponse.json({ id: emailDomain.id });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
