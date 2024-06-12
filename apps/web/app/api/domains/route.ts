import { addDomainToVercel, validateDomain } from "@/lib/api/domains";
import { addDomain } from "@/lib/api/domains/add-domain";
import { transformDomain } from "@/lib/api/domains/transform-domain";
import { exceededLimitError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDomainBodySchema } from "@/lib/zod/schemas/domains";
import { NextResponse } from "next/server";

// GET /api/domains – get all domains for a workspace
export const GET = withWorkspace(async ({ workspace }) => {
  const domains = await prisma.domain.findMany({
    where: {
      projectId: workspace.id,
    },
    include: {
      links: {
        select: {
          url: true,
          rewrite: true,
          clicks: true,
          expiredUrl: true,
          noindex: true,
        },
      },
    },
  });

  const result = domains.map((domain) => {
    const domainRecord = transformDomain(domain);

    return {
      ...domainRecord,
      url: domainRecord.target,
    };
  });

  return NextResponse.json(result);
});

// POST /api/domains - add a domain
export const POST = withWorkspace(async ({ req, workspace, session }) => {
  const body = await parseRequestBody(req);
  const payload = addDomainBodySchema.parse(body);

  const { slug, type, target, noindex } = payload;

  if (workspace.domains.length >= workspace.domainsLimit) {
    return new Response(
      exceededLimitError({
        plan: workspace.plan,
        limit: workspace.domainsLimit,
        type: "domains",
      }),
      { status: 403 },
    );
  }

  const validDomain = await validateDomain(slug);

  if (validDomain !== true) {
    return new Response(validDomain, { status: 422 });
  }

  const vercelResponse = await addDomainToVercel(slug);

  if (
    vercelResponse.error &&
    vercelResponse.error.code !== "domain_already_in_use" // ignore this error
  ) {
    return new Response(vercelResponse.error.message, { status: 422 });
  }

  /* 
    If the domain is being added, we need to:
      1. Add the domain to Vercel
      2. If there's a landing page set, update the root domain in Redis
      3. If the workspace has no domains (meaning this is the first domain added), set it as primary
  */
  const domainRecord = await addDomain({
    ...payload,
    workspace,
    userId: session.user.id,
  });

  return NextResponse.json(domainRecord, {
    status: 201,
  });
});
