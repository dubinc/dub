import {
  addDomainToVercel,
  deleteDomainAndLinks,
  removeDomainFromVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DomainSchema, updateDomainBodySchema } from "@/lib/zod/schemas";
import { NextResponse } from "next/server";

// GET /api/domains/[domain] – get a workspace's domain
export const GET = withWorkspace(
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
      throw new DubApiError({
        code: "not_found",
        message: "Domain not found",
      });
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
export const PATCH = withWorkspace(
  async ({ req, workspace, domain }) => {
    const body = await parseRequestBody(req);
    const {
      slug: newDomain,
      target,
      type,
      placeholder,
      expiredUrl,
      archived,
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

    const response = await Promise.all([
      prisma.domain.update({
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
        url: target || undefined,
      }),
      rewrite: type === "rewrite",
      ...(newDomain !== domain && {
        newDomain,
      }),
      projectId: workspace.id,
    });

    return NextResponse.json(DomainSchema.parse(response[0]));
  },
  {
    domainChecks: true,
    requiredRole: ["owner"],
  },
);

// DELETE /api/domains/[domain] - delete a workspace's domain
export const DELETE = withWorkspace(
  async ({ domain }) => {
    await deleteDomainAndLinks(domain);
    return NextResponse.json({ slug: domain });
  },
  {
    domainChecks: true,
    requiredRole: ["owner"],
  },
);
