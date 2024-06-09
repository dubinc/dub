import {
  addDomainToVercel,
  deleteDomainAndLinks,
  removeDomainFromVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { transformDomain } from "@/lib/api/domains/transform-domain";
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
export const GET = withWorkspace(
  async ({ domain }) => {
    const domainRecord = await prisma.domain.findUnique({
      where: {
        slug: domain,
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

    if (!domainRecord) {
      throw new DubApiError({
        code: "not_found",
        message: "Domain not found",
      });
    }

    const result = transformDomain({
      ...domainRecord,
      ...domainRecord.links[0],
    });

    return NextResponse.json(result);
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
        archived,
        ...(placeholder && { placeholder }),
        // ...(workspace.plan !== "free" && {
        //   target,
        //   expiredUrl,
        //   noindex: noindex === undefined ? true : noindex,
        // }),
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
