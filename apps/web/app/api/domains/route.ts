import {
  addDomainToVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { transformDomain } from "@/lib/api/domains/transform-domain";
import { DubApiError, ErrorCodes, exceededLimitError } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDomainBodySchema } from "@/lib/zod/schemas/domains";
import { waitUntil } from "@vercel/functions";
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
        },
        take: 1,
      },
    },
  });

  const result = domains.map((domain) =>
    transformDomain({ ...domain, ...domain.links[0] }),
  );

  return NextResponse.json(result);
});

// POST /api/domains - add a domain
export const POST = withWorkspace(async ({ req, workspace, session }) => {
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

  if (validDomain !== true) {
    return new Response(validDomain, { status: 422 });
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
  const domainRecord = await prisma.domain.create({
    data: {
      slug: domain,
      projectId: workspace.id,
      primary: workspace.domains.length === 0,
      ...(placeholder && { placeholder }),
    },
  });

  workspace.domains.push({
    slug: domainRecord.slug,
    primary: domainRecord.primary,
  });

  // TODO:
  // Store noindex

  const { link, error, code } = await processLink({
    payload: {
      id: domainRecord.id,
      domain: domainRecord.slug,
      key: "_root",
      createdAt: domainRecord.createdAt,
      archived: false,
      proxy: false,
      publicStats: false,
      trackConversion: false,
      ...(workspace.plan === "free"
        ? {
            url: "",
            expiredUrl: null,
            rewrite: false,
          }
        : {
            url: target || "",
            expiredUrl: expiredUrl || null,
            rewrite: type === "rewrite",
          }),
    },
    workspace,
    userId: session.user.id,
    skipKeyChecks: true,
  });

  if (error != null) {
    throw new DubApiError({
      code: code as ErrorCodes,
      message: error,
    });
  }

  const newLink = await createLink(link);

  waitUntil(
    setRootDomain({
      id: domainRecord.id,
      domain,
      domainCreatedAt: domainRecord.createdAt,
      projectId: workspace.id,
      ...(workspace.plan !== "free" && {
        url: target || undefined,
        noindex: noindex === undefined ? true : noindex,
      }),
      rewrite: type === "rewrite",
    }),
  );

  const result = transformDomain({
    ...domainRecord,
    ...newLink,
  });

  return NextResponse.json(result, {
    status: 201,
  });
});
