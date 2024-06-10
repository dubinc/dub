import {
  addDomainToVercel,
  deleteDomainAndLinks,
  removeDomainFromVercel,
  setRootDomain,
  validateDomain,
} from "@/lib/api/domains";
import { transformDomain } from "@/lib/api/domains/transform-domain";
import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { processLink, updateLink } from "@/lib/api/links";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewLinkProps } from "@/lib/types";
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

    const {
      slug: newDomain,
      target,
      type,
      placeholder,
      expiredUrl,
      archived,
      noindex,
    } = payload;

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

    const domainRecord = await prisma.domain.update({
      where: {
        slug: domain,
      },
      data: {
        slug: newDomain,
        archived,
        ...(placeholder && { placeholder }),
      },
      include: {
        links: {
          take: 1,
        },
      },
    });

    // TODO:
    // Store noindex

    const link = domainRecord.links[0];

    const updatedLink = {
      ...link,
      expiresAt:
        link.expiresAt instanceof Date
          ? link.expiresAt.toISOString()
          : link.expiresAt,
      geo: link.geo as NewLinkProps["geo"],
      ...(workspace.plan != "free" && {
        ...("rewrite" in payload && { rewrite: type === "rewrite" }),
        ...("target" in payload && { url: target || "" }),
        ...("expiredUrl" in payload && { expiredUrl }),
      }),
    };

    const {
      link: processedLink,
      error,
      code,
    } = await processLink({
      payload: updatedLink,
      workspace,
      skipKeyChecks: true,
    });

    if (error != null) {
      throw new DubApiError({
        code: code as ErrorCodes,
        message: error,
      });
    }

    const response = await updateLink({
      oldDomain: link.domain,
      oldKey: link.key,
      updatedLink: processedLink,
    });

    const result = transformDomain({
      ...domainRecord,
      ...response,
    });

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

    return NextResponse.json(result);
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
