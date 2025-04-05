import { createId } from "@/lib/api/create-id";
import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  createOrUpdateEmailDomainSchema,
  EmailDomainSchema,
} from "@/lib/zod/schemas/email-domain";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const EMAIL_DOMAIN_LIMIT = 1;

// GET /api/email-domains – get all email domains for a workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const domains = await prisma.emailDomain.findMany({
      where: {
        workspaceId: workspace.id,
      },
    });

    return NextResponse.json(z.array(EmailDomainSchema).parse(domains));
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
    f,
  },
);

// POST /api/email-domains - add an email domain
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    if (!workspace.partnersEnabled) {
      throw new DubApiError({
        code: "forbidden",
        message: "This feature is not enabled on your plan.",
      });
    }

    const { slug } = createOrUpdateEmailDomainSchema.parse(
      await parseRequestBody(req),
    );

    const domainFound = await prisma.emailDomain.findUnique({
      where: {
        slug,
      },
    });

    if (domainFound) {
      throw new DubApiError({
        code: "conflict",
        message: `Email domain ${slug} is already in use.`,
      });
    }

    const domainRecord = await prisma.$transaction(
      async (tx) => {
        const totalDomains = await tx.emailDomain.count({
          where: {
            workspaceId: workspace.id,
          },
        });

        if (totalDomains >= EMAIL_DOMAIN_LIMIT) {
          throw new DubApiError({
            code: "exceeded_limit",
            message: exceededLimitError({
              plan: workspace.plan,
              limit: workspace.domainsLimit,
              type: "domains",
            }),
          });
        }

        return await tx.emailDomain.create({
          data: {
            id: createId({ prefix: "dom_" }),
            workspaceId: workspace.id,
            slug,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 5000,
      },
    );

    return NextResponse.json(EmailDomainSchema.parse(domainRecord), {
      status: 201,
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
