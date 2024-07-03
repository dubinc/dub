import { addDomainToVercel, validateDomain } from "@/lib/api/domains";
import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DomainSchema,
  createDomainBodySchema,
} from "@/lib/zod/schemas/domains";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/domains – get all domains for a workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const domains = await prisma.domain.findMany({
      where: {
        projectId: workspace.id,
      },
    });

    return NextResponse.json(z.array(DomainSchema).parse(domains));
  },
  {
    requiredScopes: ["domains.read"],
  },
);

// POST /api/domains - add a domain
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const body = await parseRequestBody(req);
    const { slug, placeholder, expiredUrl } =
      createDomainBodySchema.parse(body);

    const totalDomains = await prisma.domain.count({
      where: {
        projectId: workspace.id,
      },
    });

    if (totalDomains >= workspace.domainsLimit) {
      return new Response(
        exceededLimitError({
          plan: workspace.plan,
          limit: workspace.domainsLimit,
          type: "domains",
        }),
        { status: 403 },
      );
    }

    if (workspace.plan === "free" && expiredUrl) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You can only use Default Expiration URLs on a Pro plan and above. Upgrade to Pro to use these features.",
      });
    }

    const validDomain = await validateDomain(slug);

    if (validDomain.error && validDomain.code) {
      throw new DubApiError({
        code: validDomain.code,
        message: validDomain.error,
      });
    }

    const vercelResponse = await addDomainToVercel(slug);

    if (
      vercelResponse.error &&
      vercelResponse.error.code !== "domain_already_in_use" // ignore this error
    ) {
      return new Response(vercelResponse.error.message, { status: 422 });
    }

    const domainRecord = await prisma.domain.create({
      data: {
        slug: slug,
        projectId: workspace.id,
        primary: totalDomains === 0,
        ...(placeholder && { placeholder }),
        ...(workspace.plan !== "free" && {
          expiredUrl,
        }),
      },
    });

    return NextResponse.json(DomainSchema.parse(domainRecord), {
      status: 201,
    });
  },
  {
    requiredScopes: ["domains.write"],
  },
);
