import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import {
  addDomainToVercel,
  changeDomainForImages,
  changeDomainForLinks,
  deleteDomainAndLinks,
  removeDomainFromVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { NextResponse } from "next/server";

// GET /api/projects/[slug]/domains/[domain] – get a project's domain
export const GET = withAuth(async ({ domain }) => {
  const data = await prisma.domain.findUnique({
    where: {
      slug: domain,
    },
    select: {
      slug: true,
      verified: true,
      primary: true,
      target: true,
      type: true,
      placeholder: true,
      clicks: true,
    },
  });
  if (!data) {
    return new Response("Domain not found", { status: 404 });
  }
  return NextResponse.json({
    ...data,
    url: data.target,
  });
});

// PUT /api/projects/[slug]/domains/[domain] – edit a project's domain
export const PUT = withAuth(async ({ req, project, domain }) => {
  const {
    slug: newDomain,
    target,
    type,
    placeholder,
    primary,
  } = await req.json();

  if (newDomain !== domain) {
    const validDomain = await validateDomain(newDomain);
    if (validDomain !== true) {
      return new Response(validDomain, { status: 422 });
    }
    const vercelResponse = await addDomainToVercel(newDomain);
    if (vercelResponse.error) {
      return new Response(vercelResponse.error.message, { status: 422 });
    }
  }

  const response = await Promise.allSettled([
    // if the domain is being changed, we need to:
    //  1. Remove the old domain from Vercel
    //  2. Add the new domain to Vercel
    //  3. Update all links in the project to point to the new domain
    //  4. Update all images in the project to point to the new domain
    ...(newDomain !== domain
      ? [
          removeDomainFromVercel(domain),
          changeDomainForLinks(domain, newDomain),
          changeDomainForImages(domain, newDomain),
        ]
      : []),
    /* 
      if the project is not a free plan:
        - if the domain is being set: 
          - Set the root domain to the target in Redis
          - if the domain is being changed, also change the root domain key in Redis
        - if the domain is being unset:
          - delete the root domain key in Redis
    */
    project.plan !== "free" &&
      (target
        ? setRootDomain({
            domain,
            target,
            rewrite: type === "rewrite",
            ...(newDomain !== domain && {
              newDomain,
            }),
          })
        : redis.del(`root:${domain}`)),
    // if the domain is being set as the primary domain, set the current primary domain to false
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
    // Update the domain in the database along with its primary status
    prisma.domain.update({
      where: {
        slug: domain,
      },
      data: {
        ...(newDomain !== domain && {
          slug: newDomain,
        }),
        // same logic as the redis part above
        ...(project.plan !== "free" &&
          (target
            ? {
                target,
              }
            : {
                target: null,
              })),
        type,
        placeholder,
        primary,
      },
    }),
  ]);

  return NextResponse.json(response);
});

// DELETE /api/projects/[slug]/domains/[domain] - delete a project's domain
export const DELETE = withAuth(async ({ domain }) => {
  const response = await deleteDomainAndLinks(domain);
  return NextResponse.json(response);
});
