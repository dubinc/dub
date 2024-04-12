import {
  addDomainToVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { exceededLimitError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/domains – get all domains for a workspace
export const GET = withAuth(async ({ workspace }) => {
  const domains = await prisma.domain.findMany({
    where: {
      projectId: workspace.id,
    },
    select: {
      slug: true,
      verified: true,
      primary: true,
      archived: true,
      target: true,
      type: true,
      placeholder: true,
      clicks: true,
      expiredUrl: true,
    },
  });
  return NextResponse.json(domains);
});

// POST /api/domains - add a domain
export const POST = withAuth(async ({ req, workspace }) => {
  const {
    slug: domain,
    target,
    type,
    expiredUrl,
    placeholder,
  } = await req.json();

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
  const response = await prisma.domain.create({
    data: {
      slug: domain,
      type,
      projectId: workspace.id,
      primary: workspace.domains.length === 0,
      placeholder,
      ...(workspace.plan !== "free" && {
        target,
        expiredUrl,
      }),
    },
  });

  await setRootDomain({
    id: response.id,
    domain,
    projectId: workspace.id,
    ...(workspace.plan !== "free" && {
      url: target,
    }),
    rewrite: type === "rewrite",
  });

  return NextResponse.json(response);
});
