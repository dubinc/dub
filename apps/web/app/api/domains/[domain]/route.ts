import {
  addDomainToVercel,
  deleteDomainAndLinks,
  removeDomainFromVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { transformDomain } from "@/lib/api/domains/transform-domain";
import { updateDomain } from "@/lib/api/domains/update-domain";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateDomainBodySchema } from "@/lib/zod/schemas/domains";
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
    const payload = updateDomainBodySchema.parse(body);

    const { slug: newDomain, target, type, noindex } = payload;

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

    const domainRecord = await updateDomain({
      ...payload,
      slug: domain,
      newSlug: newDomain,
      workspace,
    });

    // TODO:
    // Store noindex

    waitUntil(
      Promise.all([
        setRootDomain({
          id: domainRecord.id,
          domain,
          domainCreatedAt: domainRecord.createdAt,
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

    return NextResponse.json(domainRecord);
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
