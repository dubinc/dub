import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  addDomainToVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { exceededLimitError } from "@/lib/api/errors";

// GET /api/projects/[slug]/domains – get all domains for a project
export const GET = withAuth(async ({ project }) => {
  const domains = await prisma.domain.findMany({
    where: {
      projectId: project.id,
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
    },
  });
  return NextResponse.json(domains);
});

// POST /api/projects/[slug]/domains - add a domain
export const POST = withAuth(async ({ req, project }) => {
  const { slug: domain, primary, archived, target, type } = await req.json();

  if (project.domains.length >= project.domainsLimit) {
    return new Response(
      exceededLimitError({
        plan: project.plan,
        limit: project.domainsLimit,
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
  if (vercelResponse.error) {
    return new Response(vercelResponse.error.message, { status: 422 });
  }
  /* 
        If the domain is being added, we need to:
          1. Add the domain to Vercel
          2. If there's a landing page set, update the root domain in Redis
          3. If the domain is being set as the primary domain, set all other domains to not be the primary domain
          4. Add the domain to the database along with its primary status
      */
  const response = await Promise.all([
    prisma.domain.create({
      data: {
        slug: domain,
        target,
        type,
        projectId: project.id,
        primary: primary || project.domains.length === 0,
        archived,
      },
    }),
    primary &&
      prisma.domain.updateMany({
        where: {
          projectId: project.id,
          primary: true,
        },
        data: {
          primary: false,
        },
      }),
  ]);

  await setRootDomain({
    id: response[0].id,
    domain,
    projectId: project.id,
    ...(project.plan !== "free" && {
      url: target,
    }),
    rewrite: type === "rewrite",
  });

  return NextResponse.json(response);
});
