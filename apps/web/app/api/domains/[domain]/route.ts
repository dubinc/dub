import {
  addDomainToVercel,
  deleteDomainAndLinks,
  removeDomainFromVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/domains/[domain] – get a workspace's domain
export const GET = withAuth(
  async ({ domain }) => {
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
        expiredUrl: true,
      },
    });
    if (!data) {
      return new Response("Domain not found", { status: 404 });
    }
    return NextResponse.json({
      ...data,
      url: data.target,
    });
  },
  {
    domainChecks: true,
  },
);

// PUT /api/domains/[domain] – edit a workspace's domain
export const PUT = withAuth(
  async ({ req, workspace, domain }) => {
    const {
      slug: newDomain,
      target,
      type,
      placeholder,
      expiredUrl,
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

    const response = await Promise.all([
      prisma.domain.update({
        where: {
          slug: domain,
        },
        data: {
          ...(newDomain !== domain && {
            slug: newDomain,
          }),
          type,
          placeholder,
          // only set target and expiredUrl if the workspace is not free
          ...(workspace.plan !== "free" && {
            target: target || null,
            expiredUrl: expiredUrl || null,
          }),
        },
      }),
      // remove old domain from Vercel
      newDomain !== domain && removeDomainFromVercel(domain),
    ]);

    await setRootDomain({
      id: response[0].id,
      domain,
      ...(workspace.plan !== "free" && {
        url: target,
      }),
      rewrite: type === "rewrite",
      ...(newDomain !== domain && {
        newDomain,
      }),
      projectId: workspace.id,
    });

    return NextResponse.json(response);
  },
  {
    domainChecks: true,
    requiredRole: ["owner"],
  },
);

// DELETE /api/domains/[domain] - delete a workspace's domain
export const DELETE = withAuth(
  async ({ domain }) => {
    const response = await deleteDomainAndLinks(domain);
    return NextResponse.json(response);
  },
  {
    domainChecks: true,
    requiredRole: ["owner"],
  },
);
