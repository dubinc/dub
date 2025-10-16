import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  EmailDomainSchema,
  updateEmailDomainBodySchema,
} from "@/lib/zod/schemas/email-domains";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/email-domains/[domain] - get an email domain
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { domain } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const emailDomain = await prisma.emailDomain.findUnique({
      where: {
        slug: domain,
      },
    });

    if (!emailDomain) {
      throw new DubApiError({
        message: `Email domain (${domain}) not found.`,
        code: "not_found",
      });
    }

    if (emailDomain.programId !== programId) {
      throw new DubApiError({
        message: `Email domain (${domain}) is not associated with the program.`,
        code: "forbidden",
      });
    }

    return NextResponse.json(EmailDomainSchema.parse(emailDomain));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

// PATCH /api/email-domains/[domain] - update an email domain
export const PATCH = withWorkspace(
  async ({ workspace, params, req }) => {
    const { domain } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { slug, fromAddress } = updateEmailDomainBodySchema.parse(
      await parseRequestBody(req),
    );

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

    const emailDomain = await prisma.emailDomain.findUnique({
      where: {
        slug: domain,
      },
    });

    if (!emailDomain) {
      throw new DubApiError({
        message: `Email domain (${domain}) not found.`,
        code: "bad_request",
      });
    }

    if (emailDomain.programId !== programId) {
      throw new DubApiError({
        message: `Email domain (${domain}) is not associated with the program.`,
        code: "bad_request",
      });
    }

    await prisma.emailDomain.delete({
      where: {
        id: emailDomain.id,
      },
    });

    return NextResponse.json({ id: emailDomain.id });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
