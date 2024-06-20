import { addDomainToVercel, validateDomain } from "@/lib/api/domains";
import { createDomain } from "@/lib/api/domains/create-domain";
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
export const GET = withWorkspace(async ({ workspace }) => {
  const domains = await prisma.domain.findMany({
    where: {
      projectId: workspace.id,
    },
  });

  return NextResponse.json(z.array(DomainSchema).parse(domains));
});

// POST /api/domains - add a domain
export const POST = withWorkspace(async ({ req, workspace, session }) => {
  const body = await parseRequestBody(req);
  const payload = createDomainBodySchema.parse(body);

  const { slug } = payload;

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

  /* 
    If the domain is being added, we need to:
      1. Add the domain to Vercel
      2. If there's a landing page set, update the root domain in Redis
      3. If the workspace has no domains (meaning this is the first domain added), set it as primary
  */
  const domainRecord = await createDomain({
    ...payload,
    workspace,
    userId: session.user.id,
  });

  return NextResponse.json(DomainSchema.parse(domainRecord), {
    status: 201,
  });
});
