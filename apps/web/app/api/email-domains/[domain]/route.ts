import { getEmailDomainOrThrow } from "@/lib/api/domains/get-email-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  createOrUpdateEmailDomainSchema,
  EmailDomainSchema,
} from "@/lib/zod/schemas/email-domain";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/email-domains/[domain] – get an email domain
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const domainRecord = await getEmailDomainOrThrow({
      workspace,
      domain: params.domain,
    });

    return NextResponse.json(EmailDomainSchema.parse(domainRecord));
  },
  {
    requiredPermissions: ["domains.read"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);

// PUT /api/email-domains/[domain] – update an email domain
export const PATCH = withWorkspace(
  async ({ req, workspace, params }) => {
    const existingDomain = await getEmailDomainOrThrow({
      workspace,
      domain: params.domain,
    });

    const { slug: newDomain } = createOrUpdateEmailDomainSchema.parse(
      await parseRequestBody(req),
    );

    const domainChanged =
      newDomain.toLowerCase() !== existingDomain.slug.toLowerCase();

    // Return the existing domain if it's not changed
    if (!domainChanged) {
      return NextResponse.json(EmailDomainSchema.parse(existingDomain));
    }

    const domainFound = await prisma.emailDomain.findUnique({
      where: {
        slug: newDomain,
      },
    });

    if (domainFound) {
      throw new DubApiError({
        code: "conflict",
        message: `Email domain ${newDomain} is already in use.`,
      });
    }

    const domainRecord = await prisma.emailDomain.update({
      where: {
        slug: existingDomain.slug,
      },
      data: {
        slug: newDomain,
      },
    });

    return NextResponse.json(EmailDomainSchema.parse(domainRecord));
  },
  {
    requiredPermissions: ["domains.write"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);

// DELETE /api/email-domains/[domain] - delete an email domain
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    await getEmailDomainOrThrow({
      workspace,
      domain: params.domain,
    });

    await prisma.emailDomain.delete({
      where: {
        slug: params.domain,
      },
    });

    return NextResponse.json({
      slug: params.domain,
    });
  },
  {
    requiredPermissions: ["domains.write"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
