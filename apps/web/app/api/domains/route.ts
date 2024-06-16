import {
  addDomainToVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { DomainSchema, addDomainBodySchema } from "@/lib/zod/schemas/domains";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

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
export const POST = withWorkspace(async ({ req, workspace }) => {
  const body = await parseRequestBody(req);
  const {
    slug: domain,
    target,
    type,
    expiredUrl,
    placeholder,
    noindex,
  } = addDomainBodySchema.parse(body);

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

  const validDomain = await validateDomain(domain);

  if (validDomain.error && validDomain.code) {
    throw new DubApiError({
      code: validDomain.code,
      message: validDomain.error,
    });
  }
  const vercelResponse = await addDomainToVercel(domain);

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
  const response = await prisma.domain.create({
    data: {
      slug: domain,
      type,
      projectId: workspace.id,
      primary: workspace.domains.length === 0,
      ...(placeholder && { placeholder }),
      ...(workspace.plan !== "free" && {
        target,
        expiredUrl,
        noindex: noindex === undefined ? true : noindex,
      }),
    },
  });

  waitUntil(
    setRootDomain({
      id: response.id,
      domain,
      domainCreatedAt: response.createdAt,
      projectId: workspace.id,
      ...(workspace.plan !== "free" && {
        url: target || undefined,
        noindex: noindex === undefined ? true : noindex,
      }),
      rewrite: type === "rewrite",
    }),
  );

  return NextResponse.json(DomainSchema.parse(response), { status: 201 });
});
