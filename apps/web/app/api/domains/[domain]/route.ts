import {
  addDomainToVercel,
  deleteDomainAndLinks,
  removeDomainFromVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DUB_WORKSPACE_ID, isDubDomain } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/domains/[domain] – get a workspace's domain
export const GET = withAuth(async ({ domain, workspace }) => {
  if (isDubDomain(domain) && workspace.id !== DUB_WORKSPACE_ID) {
    return new Response("Domain does not belong to workspace.", {
      status: 403,
    });
  }

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

// PUT /api/domains/[domain] – edit a workspace's domain
export const PUT = withAuth(async ({ req, workspace, domain }) => {
  const {
    slug: newDomain,
    target,
    type,
    placeholder,
    primary,
    archived,
  } = await req.json();

  if (isDubDomain(domain) && workspace.id !== DUB_WORKSPACE_ID) {
    return new Response("Domain does not belong to workspace.", {
      status: 403,
    });
  }

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
        ...(workspace.plan !== "free" &&
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
        archived,
      },
    }),
    // if the domain is being set as the primary domain, set the current primary domain to false
    primary &&
      prisma.domain.updateMany({
        where: {
          projectId: workspace.id,
          primary: true,
        },
        data: {
          primary: false,
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
});

// DELETE /api/domains/[domain] - delete a workspace's domain
export const DELETE = withAuth(async ({ domain, workspace }) => {
  if (isDubDomain(domain) && workspace.id !== DUB_WORKSPACE_ID) {
    return new Response("Domain does not belong to workspace.", {
      status: 403,
    });
  }

  const response = await deleteDomainAndLinks(domain);

  return NextResponse.json(response);
});
