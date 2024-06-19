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
import { prisma } from "@/lib/prisma";
import {
  DomainSchema,
  updateDomainBodySchema,
} from "@/lib/zod/schemas/domains";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/domains/[domain] – get a workspace's domain
export const GET = withWorkspace(
  async ({ domain }) => {
    const data = await prisma.domain.findUnique({
      where: {
        slug: domain,
      },
      select: {
        id: true,
        slug: true,
        archived: true,
        verified: true,
        primary: true,
        target: true,
        type: true,
        noindex: true,
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
    requiredScopes: ["domains.read", "domains.write"],
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

    if (newDomain && newDomain.toLowerCase() !== domain.toLowerCase()) {
      const validDomain = await validateDomain(newDomain);
      if (validDomain.error && validDomain.code) {
        throw new DubApiError({
          code: validDomain.code,
          message: validDomain.error,
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
        newDomain &&
          newDomain.toLowerCase() !== domain.toLowerCase() &&
          removeDomainFromVercel(domain),
      ]),
    );

    return NextResponse.json(DomainSchema.parse(response));
  },
  {
    domainChecks: true,
    requiredScopes: ["domains.write"],
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
    requiredScopes: ["domains.write"],
  },
);
