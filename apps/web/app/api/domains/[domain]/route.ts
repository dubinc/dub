import {
  addDomainToVercel,
  deleteDomainAndLinks,
  removeDomainFromVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { getDomain } from "@/lib/api/domains/get-domain";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DomainSchema,
  updateDomainBodySchema,
} from "@/lib/zod/schemas/domains";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/domains/[domain] – get a workspace's domain
export const GET = withWorkspace(async ({ workspace, params }) => {
  const data = await getDomain({
    workspaceId: workspace.id,
    slug: params.domain,
  });

  return NextResponse.json({
    ...data,
    url: data.target,
  });
});

// PUT /api/domains/[domain] – edit a workspace's domain
export const PATCH = withWorkspace(
  async ({ req, workspace, params }) => {
    const { slug: domain } = await getDomain({
      workspaceId: workspace.id,
      slug: params.domain,
    });

    const body = await parseRequestBody(req);
    const {
      slug: newDomain,
      target,
      type,
      placeholder,
      expiredUrl,
      archived,
      noindex,
    } = updateDomainBodySchema.parse(body);

    if (newDomain && newDomain !== domain) {
      const validDomain = await validateDomain(newDomain);
      if (validDomain !== true) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: validDomain,
        });
      }
      const vercelResponse = await addDomainToVercel(newDomain);
      if (vercelResponse.error) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: vercelResponse.error.message,
        });
      }
    }

    const response = await prisma.domain.update({
      where: {
        slug: domain,
      },
      data: {
        slug: newDomain,
        type,
        archived,
        ...(placeholder && { placeholder }),
        ...(workspace.plan !== "free" && {
          target,
          expiredUrl,
          noindex: noindex === undefined ? true : noindex,
        }),
      },
    });

    waitUntil(
      Promise.all([
        setRootDomain({
          id: response.id,
          domain,
          domainCreatedAt: response.createdAt,
          ...(workspace.plan !== "free" && {
            url: target || undefined,
            noindex: noindex === undefined ? true : noindex,
          }),
          rewrite: type === "rewrite",
          ...(newDomain !== domain && {
            newDomain,
          }),
          projectId: workspace.id,
        }),
        // remove old domain from Vercel
        newDomain !== domain && removeDomainFromVercel(domain),
      ]),
    );

    return NextResponse.json(DomainSchema.parse(response));
  },
  {
    requiredRole: ["owner"],
  },
);

// DELETE /api/domains/[domain] - delete a workspace's domain
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const { slug: domain } = await getDomain({
      workspaceId: workspace.id,
      slug: params.domain,
    });

    await deleteDomainAndLinks(domain);
    return NextResponse.json({ slug: domain });
  },
  {
    requiredRole: ["owner"],
  },
);
