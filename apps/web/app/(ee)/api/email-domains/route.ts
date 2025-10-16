import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  createEmailDomainBodySchema,
  EmailDomainSchema,
} from "@/lib/zod/schemas/email-domains";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/email-domains - get all email domains for a program
export const GET = withWorkspace(
  async ({ workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const emailDomain = await prisma.emailDomain.findUnique({
      where: {
        programId,
      },
    });

    const response = emailDomain
      ? z.array(EmailDomainSchema).parse([emailDomain])
      : [];

    return NextResponse.json(response);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

// POST /api/email-domains - create an email domain
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { slug, fromAddress } = createEmailDomainBodySchema.parse(
      await parseRequestBody(req),
    );

    try {
      const emailDomain = await prisma.emailDomain.create({
        data: {
          id: createId({ prefix: "dom_" }),
          workspaceId: workspace.id,
          programId,
          slug,
          fromAddress,
        },
      });

      return NextResponse.json(EmailDomainSchema.parse(emailDomain));
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "bad_request",
          message: "Email domain already exists.",
        });
      }

      throw error;
    }
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
