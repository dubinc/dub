import {
  addDomainToVercel,
  deleteDomainAndLinks,
  removeDomainFromVercel,
  validateDomain,
} from "@/lib/api/domains";
import { getDomain } from "@/lib/api/domains/get-domain";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { updateDomainBodySchema } from "@/lib/zod/schemas/domains";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/domains/[domain] – get a workspace's domain
export const GET = withWorkspace(
  async ({ domain, workspace }) => {
    const result = await getDomain({
      slug: domain,
      workspaceId: workspace.id,
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

    const { slug: newDomain, placeholder, expiredUrl, archived } = payload;

    const domainUpdated =
      newDomain && newDomain.toLowerCase() !== domain.toLowerCase();

    if (domainUpdated) {
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

    const domainRecord = await prisma.domain.update({
      where: {
        slug: domain,
      },
      data: {
        archived,
        ...(domainUpdated && { slug: newDomain }),
        ...(placeholder && { placeholder }),
        ...(workspace.plan != "free" && {
          expiredUrl,
        }),
      },
    });

    waitUntil(
      (async () => {
        if (domainUpdated) {
          await Promise.all([
            // remove old domain from Vercel
            removeDomainFromVercel(domain),
            // rename redis key
            redis.rename(domain, newDomain),
          ]);

          const allLinks = await prisma.link.findMany({
            where: {
              domain: newDomain,
            },
            include: {
              tags: true,
            },
          });

          // update all links in Tinybird
          recordLink([
            ...allLinks.map((link) => ({
              link_id: link.id,
              domain: link.domain,
              key: link.key,
              url: link.url,
              tag_ids: link.tags.map((tag) => tag.tagId),
              workspace_id: link.projectId,
              created_at: link.createdAt,
            })),
          ]);
        }
      })(),
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
